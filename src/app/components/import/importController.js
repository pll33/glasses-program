import angular from 'angular';
import Papa from 'papaparse';
import { addParse, axisParse, axisStringParse, floatParse, formatFloat, roundEquiv, sphericalEquiv } from '../../utils';

export function importController($scope, $inventoryService) {
    const defaultForm = { rightSphere: '', rightCylinder: '', rightAxis: '', rightADD: '', leftSphere: '', leftCylinder: '', leftAxis: '', leftADD: '' };

    $scope.add = angular.copy(defaultForm); 

    $scope.inventory = $inventoryService;
    $scope.addedGlasses = [];
    $scope.importLoadingIcon = false;

    let parsePairNum = function(inStr) {
        if (typeof inStr !== 'string') inStr = inStr.toString();
        return parseInt(inStr.replace( /^\D+/g, '')); 
    };
    let parseSetLetter = function(inStr) {
        if (typeof inStr !== 'string') return '';
        return inStr.replace(/\d+$/g, '');
    };
    let parseAvail = function(inStr) {
        if (!inStr || (typeof inStr !== 'string')) { return true; }
        else {
            const s = inStr.toLowerCase();
            switch(s) {
            case 'no':
                return true;
            case 'yes':
                return false;
            default:
                return true;
            }
        }
    };

    //TODO: fix so it isn't hacky AF
    /*let noDataCheck = function(inArr) {
        let newArr = inArr.slice();
        if (newArr.length == 9) {
            newArr.pop(); // remove number
        } else if (newArr.length == 10) {
            let first = newArr[0];
            // console.log(first);
            if (typeof first === 'string') {
                // first col is a pair number/ID
                newArr.shift(); // remove number
            } else {
                // taken status is a column
                newArr.pop();
                newArr.pop();
            }
        } else if (newArr.length == 11) {
            newArr.shift(); // remove number
        }
        let arrStr = newArr.toString();
        let emptyStr = arrStr.replace(/,/g, '');
        if (emptyStr == '') return true;
        else return false;
    };*/

    function importCSV(file) {
        let tempNextNum = $scope.inventory.getPairNumber();
        let rowCount = 0;

        // parse/read in CSV file
        Papa.parse(file, {
            dynamicTyping: true,
            skipEmptyLines: true,
            // preview: 100, 
            step: function(results) {
                // add rows past row 0
                if (rowCount && results.data) {
                    // console.log('Parse row data: ', results.data);
                    // console.log('row: ', rowCount, results.data[0], noDataCheck(results.data[0]));
                    // if (!noDataCheck(results.data[0])) {
                    // console.log('row results', results);
                    // if (tempNextNum < 300) console.log(tempNextNum);
                    $scope.importCSVAdd(results.data[0], tempNextNum);
                    tempNextNum++;
                    // } else {
                    // console.log('Import CSV: Row '+rowCount+' skipped due to no glasses data.');
                    // }
                }
                rowCount++;
            },
            complete: function() {
                $scope.importLoadingIcon = false;
            },
            error: function(error) {
                console.log('Import CSV: Error encountered:', error);
                $scope.importLoadingIcon = false;
            }
        });
    }

    function importJSON(file) {
        let tempNextNum = $scope.inventory.getPairNumber();
        let fr = new FileReader();
        fr.onload = function(e) {
            let contents = e.target.result;
            let glasses = JSON.parse(contents);

            glasses.forEach(function (el) {
                el.pairNumber = tempNextNum;

                $scope.addedGlasses.push(el);
                $scope.inventory.add(el);
                tempNextNum++;
            });

            $scope.inventory.update();
            $scope.importLoadingIcon = false;
        };
        fr.readAsText(file);
    }

    function nineColumnImport(input, nextNum) {
        // rightSphere, rightCylinder, rightAxis, rightAdd, leftSphere, leftCylinder, leftAxis, leftAdd, number

        // check if input.pairNumber vs nextPairNum
        // if input < nextNum: assign nextNum
        // else if input >= nextNum: use input number
        const inputNum = parsePairNum(input[8]);
        if (!inputNum) { return {}; }

        const pairNum = (inputNum < nextNum) ? nextNum : inputNum;

        const unroundR = sphericalEquiv(floatParse(input[1]), floatParse(input[0]));
        const unroundL = sphericalEquiv(floatParse(input[5]), floatParse(input[4]));

        const roundR = roundEquiv(unroundR);
        const roundL = roundEquiv(unroundL);

        const rightCyl = floatParse(input[1]);
        const leftCyl = floatParse(input[5]);

        let data = {};

        // Negative cylinder?
        // newSphere = sph + f;
        // newCylinder = Math.abs(f);
        // newAxis = axisParse(axis+90);

        if (rightCyl < 0) {
            data.rightSphere = floatParse(input[0]) + rightCyl;
            data.rightCylinder = Math.abs(rightCyl);
            data.rightEquivUnround = unroundR;
            data.rightEquiv = roundR;
            data.rightAxis = axisParse(axisStringParse(input[2])+90);
            data.rightADD = addParse(input[3]);
        } else {
            data.rightSphere = floatParse(input[0]);
            data.rightCylinder = rightCyl;
            data.rightEquivUnround = unroundR;
            data.rightEquiv = roundR;
            data.rightAxis = axisStringParse(input[2]);
            data.rightADD = addParse(input[3]);
        }

        if (leftCyl < 0) {
            data.leftSphere = floatParse(input[4]) + leftCyl;
            data.leftCylinder = Math.abs(leftCyl);
            data.leftEquivUnround = unroundL;
            data.leftEquiv = roundL;
            data.leftAxis = axisParse(axisStringParse(input[6])+90);
            data.leftADD = addParse(input[7]);
        } else {
            data.leftSphere = floatParse(input[4]);
            data.leftCylinder = leftCyl;
            data.leftEquivUnround = unroundL;
            data.leftEquiv = roundL;
            data.leftAxis = axisStringParse(input[6]);
            data.leftADD = addParse(input[7]);
        }

        let pair = {
            setLetter: parseSetLetter(input[8]),
            pairNumber: pairNum,
            data: data,
            available: parseAvail(input[9])
        };

        return pair;
    }

    function elevenColumnImport(input, nextNum) {
        // Pair/ID number,
        // Right Sphere, Right Cylinder, Right Axis, Right Add, Right Trifocal
        // Left Sphere, Left Cylinder, Left Axis, Left Add, Left Trifocal

        // check if input.pairNumber vs nextPairNum
        // if input < nextNum: assign nextNum
        // else if input >= nextNum: use input number
        const inputNum = parsePairNum(input[0]);
        if (!inputNum) { return {}; }

        const pairNum = (inputNum < nextNum) ? nextNum : inputNum;

        const unroundR = sphericalEquiv(floatParse(input[2]), floatParse(input[1]));
        const unroundL = sphericalEquiv(floatParse(input[7]), floatParse(input[6]));

        const roundR = roundEquiv(unroundR);
        const roundL = roundEquiv(unroundL);

        const biAddR = floatParse(input[4]);
        const triAddR = floatParse(input[5]);
        const biAddL = floatParse(input[9]);
        const triAddL = floatParse(input[10]);
        const addR = (biAddR > triAddR) ? biAddR : triAddR;
        const addL = (biAddL > triAddL) ? biAddL : triAddL;

        const rightCyl = floatParse(input[2]);
        const leftCyl = floatParse(input[7]);

        let data = {};
        if (rightCyl < 0) {
            data.rightSphere = floatParse(input[1]) + rightCyl;
            data.rightCylinder = Math.abs(rightCyl);
            data.rightEquivUnround = unroundR;
            data.rightEquiv = roundR;
            data.rightAxis = axisParse(axisStringParse(input[3])+90);
            data.rightADD = addR;
        } else {
            data.rightSphere = floatParse(input[1]);
            data.rightCylinder = rightCyl;
            data.rightEquivUnround = unroundR;
            data.rightEquiv = roundR;
            data.rightAxis = axisStringParse(input[3]);
            data.rightADD = addR;
        }

        if (leftCyl < 0) {
            data.leftSphere = floatParse(input[6]) + leftCyl;
            data.leftCylinder = Math.abs(leftCyl);
            data.leftEquivUnround = unroundL;
            data.leftEquiv = roundL;
            data.leftAxis = axisParse(axisStringParse(input[8])+90);
            data.leftADD = addL;
        } else {
            data.leftSphere = floatParse(input[6]);
            data.leftCylinder = leftCyl;
            data.leftEquivUnround = unroundL;
            data.leftEquiv = roundL;
            data.leftAxis = axisStringParse(input[8]);
            data.leftADD = addL;
        }

        let pair = {
            setLetter: parseSetLetter(input[0]),
            pairNumber: pairNum,
            data: data,
            available: true
        };

        return pair;
    }

    function sixteenColumnImport(input, nextNum) {
        // Right Sphere, Right Cylinder, Right SE Unrounded, Right SE Rounded, Right Axis, Right Axis Range, Right Add,
        // Left Sphere, Left Cylinder, Left SE Unrounded, Left SE Rounded, Left Axis, Left Axis Range, Left Add,
        // Pair Number, Taken Status

        // check if input.pairNumber vs nextPairNum
        // if input < nextNum: assign nextNum
        // else if input >= nextNum: use input number
        const inputNum = parsePairNum(input[14]);
        if (!inputNum) { return {}; }

        const pairNum = (inputNum < nextNum) ? nextNum : inputNum;

        // rightSphere: floatParse(input[0]),
        // rightCylinder: floatParse(input[1]),
        // rightEquivUnround: floatParse(input[2]),
        // rightEquiv: floatParse(input[3]),
        // rightAxis: axisStringParse(input[4]),
        // rightADD: addParse(input[6]),
        // leftSphere: floatParse(input[7]),
        // leftCylinder: floatParse(input[8]),
        // leftEquivUnround: floatParse(input[9]),
        // leftEquiv: floatParse(input[10]),
        // leftAxis: axisStringParse(input[11]),
        // leftADD: addParse(input[13])

        const rightCyl = floatParse(input[1]);
        const leftCyl = floatParse(input[8]);

        let data = {};
        if (rightCyl < 0) {
            data.rightSphere = floatParse(input[0]) + rightCyl;
            data.rightCylinder = Math.abs(rightCyl);
            data.rightEquivUnround = floatParse(input[2]);
            data.rightEquiv = floatParse(input[3]);
            data.rightAxis = axisParse(axisStringParse(input[4])+90);
            data.rightADD = addParse(input[6]);
        } else {
            data.rightSphere = floatParse(input[0]);
            data.rightCylinder = rightCyl;
            data.rightEquivUnround = floatParse(input[2]);
            data.rightEquiv = floatParse(input[3]);
            data.rightAxis = axisStringParse(input[4]);
            data.rightADD = addParse(input[6]);
        }

        if (leftCyl < 0) {
            data.leftSphere = floatParse(input[7]) + leftCyl;
            data.leftCylinder = Math.abs(leftCyl);
            data.leftEquivUnround = floatParse(input[9]);
            data.leftEquiv = floatParse(input[10]);
            data.leftAxis = axisParse(axisStringParse(input[11])+90);
            data.leftADD = addParse(input[13]);
        } else {
            data.leftSphere = floatParse(input[7]);
            data.leftCylinder = leftCyl;
            data.leftEquivUnround = floatParse(input[9]);
            data.leftEquiv = floatParse(input[10]);
            data.leftAxis = axisStringParse(input[11]);
            data.leftADD = addParse(input[13]);
        }

        let pair = {
            setLetter: parseSetLetter(input[14]),
            pairNumber: pairNum,
            data: data, 
            available: parseAvail(input[15])
        };

        return pair;
    }

    // Assumes 9 columnn CSV data
    // rightSphere, rightCylinder, rightAxis, rightAdd, leftSphere, leftCylinder, leftAxis, leftAdd, number
    $scope.importCSVAdd = function(input, nextNum) {
        let emptyObjCompare = function(obj) { return JSON.stringify(obj) == JSON.stringify({}); };
        let pair = {};
        if (input.length == 9 || input.length == 10) { pair = nineColumnImport(input, nextNum); }
        else if (input.length == 11 || input.length == 12) { pair = elevenColumnImport(input, nextNum); }
        else if (input.length == 16) { pair = sixteenColumnImport(input, nextNum); }
        // console.log('ImportCSV Add:', pair);

        // add to added glasses
        // console.log(input);
        // console.log(input.length);
        if (/*emptyObjCompare(pair.data) || */emptyObjCompare(pair)) {
            // no pair data, skip row
            // if (emptyObjCompare(pair.data)) {
            //     console.log('Error adding pair #'+pair.pairNumber+': Row skipped due to no glasses data.');
            // } else {
            console.log('Error adding pair: No pair # found. Please check data columns.');
            // }
        }
        else {
            $scope.addedGlasses.push(pair);
            $scope.inventory.add(pair);
        }
    };

    $scope.manualAdd = function(input) {
        let inv = $scope.inventory;

        // calculate spherical equivalents (rounded+unrounded)
        const unroundR = sphericalEquiv(floatParse(input.rightCylinder), floatParse(input.rightSphere));
        const unroundL = sphericalEquiv(floatParse(input.leftCylinder), floatParse(input.leftSphere));

        const roundR = roundEquiv(unroundR);
        const roundL = roundEquiv(unroundL);

        const rightCyl = floatParse(input.rightCylinder);
        const leftCyl = floatParse(input.leftCylinder);
        let data = {};

        // rightSphere: floatParse(input.rightSphere),
        // rightCylinder: floatParse(input.rightCylinder),
        // rightEquivUnround: unroundR,
        // rightEquiv: roundR,
        // rightAxis: axisParse(input.rightAxis),
        // rightADD: floatParse(input.rightADD),
        // leftSphere: floatParse(input.leftSphere),
        // leftCylinder: floatParse(input.leftCylinder),
        // leftEquivUnround: unroundL,
        // leftEquiv: roundL,
        // leftAxis: axisParse(input.leftAxis),
        // leftADD: floatParse(input.leftADD)

        // Negative cylinder? 
        // newSphere = sph + f;
        // newCylinder = Math.abs(f);
        // newAxis = axisParse(axis+90);

        if (rightCyl < 0) {
            data.rightSphere = floatParse(input.rightSphere) + rightCyl;
            data.rightCylinder = Math.abs(rightCyl);
            data.rightEquivUnround = unroundR;
            data.rightEquiv = roundR;
            data.rightAxis = axisParse(axisParse(input.rightAxis) + 90);
            data.rightADD = floatParse(input.rightADD);
        } else {
            data.rightSphere = floatParse(input.rightSphere);
            data.rightCylinder = rightCyl;
            data.rightEquivUnround = unroundR;
            data.rightEquiv = roundR;
            data.rightAxis = axisParse(input.rightAxis);
            data.rightADD = floatParse(input.rightADD);
        }

        if (leftCyl < 0) {
            data.leftSphere = floatParse(input.leftSphere) + leftCyl;
            data.leftCylinder = Math.abs(leftCyl);
            data.leftEquivUnround = unroundL;
            data.leftEquiv = roundL;
            data.leftAxis = axisParse(axisParse(input.leftAxis) + 90);
            data.leftADD = floatParse(input.leftADD);
        } else { 
            data.leftSphere = floatParse(input.leftSphere);
            data.leftCylinder = leftCyl;
            data.leftEquivUnround = unroundL;
            data.leftEquiv = roundL;
            data.leftAxis = axisParse(input.leftAxis);
            data.leftADD = floatParse(input.leftADD);
        }

        let pair = {
            pairNumber: inv.getPairNumber(),
            data: data,
            available: true
        };

        // add to added glasses
        $scope.addedGlasses.push(pair);
        inv.add(pair);

        // reset input form
        this.resetAddForm();
    };
    
    $scope.resetAddForm = function() {
        $scope.manualAddForm.$setPristine();
        $scope.add = angular.copy(defaultForm);
    };

    $scope.resetUploadForm = function() {
        $scope.importFile = null;
        $scope.uploadFileForm.$setPristine();
    };

    $scope.import = function() {
        const file = $scope.importFile;
        $scope.importLoadingIcon = true;
        if (file) {
            console.log('Import file:', file.name, file.type);
            if (file.type == 'text/csv' ||file.type.indexOf('vnd.ms-excel') > -1 ||
                file.type.indexOf('spreadsheetml') > -1 ||
                file.type == 'application/excel' || file.type == 'application/vnd.msexcel') {
                console.log('Import file: Importing CSV ', file.name, file.type);
                importCSV(file);
            } else if (file.type == 'application/json') {
                console.log('Import file: Importing JSON ', file.name, file.type);
                importJSON(file);
            } else if (file.name.indexOf('.csv') === file.name.length - 4) {
                console.log('Import file: Could not confirm CSV file type but found .csv file extension. Attempting to import as CSV ', file.name);
                importCSV(file);
            } else {
                console.log('Import file: Improper file format. Upload aborted.', file.name, file.type);
            }

            setTimeout(function() {
                $scope.resetUploadForm();
                $scope.$apply();
            }, 3500);
        } else {
            console.log('Import file: No file to import.');
        }
    };

    // adds sig figs to numbers
    $scope.addFormatFloat = function(inputName) {
        switch(inputName) {
        case 'rightSphere':
            $scope.add.rightSphere = formatFloat($scope.add.rightSphere);
            break;
        case 'rightCylinder':
            $scope.add.rightCylinder = formatFloat($scope.add.rightCylinder);
            break;
        case 'rightADD':
            $scope.add.rightADD = formatFloat($scope.add.rightADD);
            break;
        case 'leftSphere':
            $scope.add.leftSphere = formatFloat($scope.add.leftSphere);
            break;
        case 'leftCylinder':
            $scope.add.leftCylinder = formatFloat($scope.add.leftCylinder);
            break;
        case 'leftADD':
            $scope.add.leftADD = formatFloat($scope.add.leftADD);
            break;
        }
    };
}

importController.$inject = ['$scope', 'inventoryService'];
