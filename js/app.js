(function () {
    var app = angular.module('app', ['pascalprecht.translate']);

    var roundEquiv = function(unrounded) {
        if (unrounded < 0) { return -1*(Math.round((-1*unrounded) * 4) / 4); }
        else { return (Math.round(unrounded * 4) / 4); }
    };
    var floatParse = function(floatNum) {
        var n = parseFloat(floatNum);
        return n || 0;
    };
    var axisParse = function(num) {
        var n = parseInt(num) || 0;
        if (n <= 0) { return 0; }
        else if (n > 180) { return num % 180; }
        else { return n; }
    }; 
    var sphericalEquiv = function(cylinder, sphere) {
        return ((cylinder * 0.5) + sphere);
    };
    var axisRange = function(axisNum) {
        if (axisNum > 121) { return "high"; }
        else if (axisNum > 61) { return "mid"; }
        else if (axisNum >= 0) { return "low"; }
        else { return ""; }
    };
    var takenStr = function(availableBool) {
        if (availableBool) { return "No"; }
        else { return "Yes"; }
    };

    var firstSearch = false;
    var searchTimeoutDelay = 2000;
    var invTimeoutDelay = 500;

    app.config(function ($translateProvider) {
        $translateProvider.translations('en', {
            GLASSES: 'Glasses',
            SEARCH: 'Search',
            DOMINANT_EYE: 'Dominant Eye',
            LEFT_EYE: 'Left Eye',
            RIGHT_EYE: 'Right Eye',
            SPHERE: 'Sphere',
            CYLINDER: 'Cylinder',
            AXIS: 'Axis',
            PATIENT_REFRACTION: 'Patient Refraction',
            SPHERICAL_EQUIV: 'Spherical Equivalent',
            UNROUNDED: 'Unrounded',
            ROUNDED: 'Rounded',
            PAIR: 'Pair',
            BIFOCAL: 'Bifocal',
            ADD: 'ADD',
            AVAILABLE: 'Available',
            RESET: 'Reset',
            FIND: 'Find',
            TAKEN: 'Taken',
            IMPORT: 'Import',
            EXPORT: 'Export',
            SYNC: 'Sync',
            INVENTORY: 'Inventory',
            SETTINGS: 'Settings',
            MANUAL_INPUT: 'Manual Input',
            ADDED_GLASSES: 'Added Glasses',
            NO_RESULTS: 'No results',
            BUTTON_LANG_EN: 'English',
            BUTTON_LANG_ES: 'Spanish'
        });
        $translateProvider.translations('es', {
            GLASSES: 'gafas',
            SEARCH: 'buscar',
            DOMINANT_EYE: '',
            LEFT_EYE: '',
            RIGHT_EYE: '',
            SPHERE: '',
            CYLINDER: '',
            AXIS: '',
            PATIENT_REFRACTION: '',
            SPHERICAL_EQUIV: '',
            UNROUNDED: '',
            ROUNDED: '',
            PAIR: '',
            BIFOCAL: '',
            ADD: '',
            AVAILABLE: '',
            RESET: '',
            FIND: '',
            TAKEN: '',
            IMPORT: 'importar',
            EXPORT: 'exportar',
            SYNC: 'sincronizar',
            INVENTORY: 'inventario',
            SETTINGS: 'configuración',
            MANUAL_INPUT: '',
            ADDED_GLASSES: '',
            NO_RESULTS: '',
            BUTTON_LANG_EN: 'inglés',
            BUTTON_LANG_ES: 'espanol'
        });
      $translateProvider.preferredLanguage('en');
    });

    app.factory('inventoryService', function() {
        var localDB = new PouchDB('glassesDB');
        var remoteDB = new PouchDB('http://localhost:5984/glassesDB');

        var _nextPairNum = 1;
        var _invTaken = [];
        var _invAvailable = [];
        var _invAllLength = 0;
        var _setLetter = "";

        var _invSearch = [];

        function initDB() {
            localDB.changes({include_docs: true}).on('change', function(info) {
                // console.log("InitDB watch: Change event fired -- ", info);
                // console.log("InitDB watch: Change event fired");
            }).on('complete', function(info) {
                console.log("InitDB watch: Complete event fired.");
                // console.log("InitDB watch: Complete event fired -- ", info);
                //only update inventory if there are actually items
                if (info.results.length) { 
                    updateInventory();
                }
            }).on('error', function(err) {
                console.log("InitDB watch: Error event fired -- ", err);
            });

            //  check if local database exists
            localDB.info().then(function (info) {
                console.log("InitDB: Local DB info:", info);
            });

            // check if remote exists
            // remoteDB.info().then(function (info) {
            //     console.log("InitDB: Remote DB info:", info);
            // });

            var nextNumDoc = {
                _id: 'next_num',
                number: _nextPairNum
            };

            // check if nextNum doc exists,
            // if exists - update nextNum
            // else - add doc for nextNum, init 1
            localDB.get('next_num').then(function(doc) {
                console.log("InitDB: next_num document already exists. Setting next_num to " + doc.number);
                _nextPairNum = doc.number;
            }).catch(function(err) {
                if (err && err.status == '404') {
                    localDB.put(nextNumDoc).then(function() {
                        console.log("InitDB: Added next_num document");
                    });
                } else {
                    console.log("InitDB: next_num document lookup error", err);
                }
            });

            // check for indexes
            localDB.getIndexes().then(function (result) {
                if (result.indexes.length > 1) {
                    console.log("InitDB: Search indexes already exist.");
                } else {
                    console.log("InitDB: Search indexes do not exist, creating indexes...");

                    // create index for inventory (pouchdb-find)
                    localDB.createIndex({
                        index: {
                            fields: ['available', 'number'],
                            name: 'inventory'
                        }
                    });

                    localDB.createIndex({
                        index: {
                            fields: ['available', 'data.rightEquiv', 'data.rightCylinder', 'data.rightAxis'],
                            name: 'rightSearch'
                        }
                    });

                    localDB.createIndex({
                        index: {
                            fields: ['available', 'data.leftEquiv', 'data.leftCylinder', 'data.leftAxis'],
                            name: 'leftSearch'
                        }
                    });

                    localDB.createIndex({
                        index: {
                            fields: ['available', 'data.rightEquiv', 'data.rightCylinder', 'data.rightAxis', 'data.leftEquiv', 'data.leftCylinder', 'data.leftAxis'],
                            name: 'noneSearch'
                        }
                    });
                }
            }).catch(function (err) {
                console.log("InitDB: Index check error.");
                console.log(err);
            });
        }

        initDB();

        var addPairDB = function(glassesObj) {
            var now = Date.now();
            var pairNumStr = 'pair-' + glassesObj.pairNumber.toString();
            var pair = {
                _id: pairNumStr,
                number: glassesObj.pairNumber,
                data: glassesObj.data,
                available: glassesObj.available,
                set: glassesObj.setLetter || _setLetter,
                time_added: now,
                time_modified: now
            };

            localDB.put(pair).then(function() {
                // console.log("Added glasses pair: #" + glassesObj.pairNumber);
                return localDB.get(pairNumStr);
            }).catch(function (err) {
                console.log("Add pair: Error when adding pair to database.", err);
                if (err.status == '409') {
                    updateNextNum(_invAllLength+1);
                }
            }).then(function() {
                updateNextNum(++_nextPairNum);
            });
        };

        /**
        **  Update pair of glasses in PouchDB database
        **    pairNum: pair #,
        **    availableBool: bool to set pair availability (true=Not Taken, false=Taken)
        **/
        var updatePairDB = function(pairNum, availableBool) {
            var pairStr = 'pair-' + pairNum.toString();

            // get pair from DB and put back
            localDB.get(pairStr).then(function(pair) {
                pair.time_modified = Date.now();
                pair.available = availableBool;
                return localDB.put(pair);
            }).catch(function (err) {
                console.log(err);
            }).then(function() {
                updateInventory();
            });
        };

        var updateInventory = function() {
            updateTaken();
            updateAvailable();
        };

        var updateNextNum = function(num) {
            localDB.get("next_num").then(function(id) {
                id.number = num;
                return localDB.put(id);
            }).catch(function (err) {
                if (err.status == "409") {
                    if (_nextPairNum == num) {
                        updateNextNum(_nextPairNum);
                        console.log("Update next_num: next_num updated after bulk operation");

                        updateInventory();
                        console.log("Update inventory: inventory updated after bulk operation");
                    }
                    // note: lots of 409s fired when importing pairs in bulk
                    // console.log("num:", num);
                    // console.log("actual next num:", _nextPairNum);
                } else {
                    console.log("Update next_num: Error.", error);
                }
            });
        };

        var updateTaken = function() {
            localDB.find({
                selector: {available: {$eq: false}}
            }).then(function(result) {
                // console.log("Taken inventory:", result);
                _invTaken = result.docs;
                _invAllLength = _invTaken.length + _invAvailable.length;
            }).catch(function(err) {
                // console.log("Update taken inventory: ", err);
            });
        };
        var updateAvailable = function() {
            localDB.find({
                selector: {available: {$eq: true}}
            }).then(function(result) {
                // console.log("Available inventory:", result);
                _invAvailable = result.docs;
                _invAllLength = _invTaken.length + _invAvailable.length;
            }).catch(function(err) {
                // console.log("Update taken inventory: ", err);
            });
        };

        // add to inventory from manual input
        // NOTE: assumes all glasses from manual input are available (=NOT taken) and from the SAME set
        inventory.add = function(obj) {
            if (obj.setLetter && !_setLetter) { _setLetter = obj.setLetter; }
            addPairDB(obj);
        };

        // search for matching available glasses in _available
        inventory.lookupDomRight = function(searchObj) {
            localDB.find({
                selector: {
                    'available': {$eq: true},
                    'data.rightEquiv': {$gte: searchObj.equivMin, $lte: searchObj.equivMax },
                    'data.rightCylinder': {$gte: searchObj.cylinderMin, $lte: searchObj.cylinderMax },
                    'data.rightAxis': {$gte: searchObj.axisMin, $lte: searchObj.axisMax } 
                }
            }).then(function(result) {
                // console.log("SEARCH DOM RIGHT: ", result);
                // console.log("SEARCH DONE: ", Date.now())
                _invSearch = result.docs;
            });
        };

        inventory.lookupDomLeft = function(searchObj) {
            localDB.find({
                selector: {
                    'available': {$eq: true},
                    'data.leftEquiv': {$gte: searchObj.equivMin, $lte: searchObj.equivMax },
                    'data.leftCylinder': {$gte: searchObj.cylinderMin, $lte: searchObj.cylinderMax },
                    'data.leftAxis': {$gte: searchObj.axisMin, $lte: searchObj.axisMax }
                }
            }).then(function(result) {
                // console.log("SEARCH DOM LEFT: ", result);
                _invSearch = result.docs;
            });
        };

        inventory.lookupDomNone = function(rightObj, leftObj) {
            localDB.find({
                selector: {
                    'available': {$eq: true},
                    'data.rightEquiv': {$gte: rightObj.equivMin, $lte: rightObj.equivMax },
                    'data.rightCylinder': {$gte: rightObj.cylinderMin, $lte: rightObj.cylinderMax },
                    'data.rightAxis': {$gte: rightObj.axisMin, $lte: rightObj.axisMax },
                    'data.leftEquiv': {$gte: leftObj.equivMin, $lte: leftObj.equivMax },
                    'data.leftCylinder': {$gte: leftObj.cylinderMin, $lte: leftObj.cylinderMax },
                    'data.leftAxis': {$gte: leftObj.axisMin, $lte: leftObj.axisMax }
                }
            }).then(function(result) {
                // console.log("SEARCH DOM NONE: ", result);
                _invSearch = result.docs;
            });
        };

        // available -> taken glasses
        inventory.take = function(pairNum) {
            console.log("Taken->Available: Pair #" + pairNum);
            updatePairDB(pairNum, false);
        };

        // taken --> available glasses
        inventory.putback = function(pairNum) {
            console.log("Available->Taken: Pair #" + pairNum);
            updatePairDB(pairNum, true);
        };

        inventory.getSearchResults = function() { return _invSearch; };
        inventory.getSetLetter = function() { return _setLetter; };
        inventory.getPairNumber = function() { return _nextPairNum; };
        inventory.getTaken = function() { return _invTaken; };
        inventory.getAvailable = function() { return _invAvailable; };

        inventory.update = function() {
            updateInventory();
        };

        inventory.sync = function() {
            localDB.replicate.to(remoteDB).on('complete', function () {
              console.log("Local->Remote: Sync complete.");
            }).on('error', function (err) {
              console.log("Local->Remote: Sync error.", err);
            });
        };

        inventory.destroy = function() {
            localDB.destroy().then(function () {
                // double-check info
                localDB.info().then(function (info) {
                    console.log("Local DB info:", info);
                }).catch(function(err) {
                    // database actually destroyed
                    console.log("Local DB: Database successfully destroyed.");

                    console.log("Local DB: Resetting database..");
                    localDB = new PouchDB('glassesDB');
                    _nextPairNum = 1;
                    _invTaken = [];
                    _invAvailable = [];
                    initDB();
                });
            }).catch(function (err) {
                console.log("Local DB: Destroy error");
                console.log(err);
            });
        };

        return inventory;
    });

    app.controller('glassesController', function ($scope, $translate) {
        this.tab = 1;
        this.setTab = function (tabId) { this.tab = tabId; };
        this.isSet = function (tabId) { return this.tab === tabId; };

        $scope.langPick = 'en';
        $scope.changeLanguage = function (key) {
            $translate.use(key);
            $scope.langPick = key;
        };
    });

    app.controller('searchCtrl', function ($scope, inventoryService) {
        var defaultForm = { dominantEye: "Right", rightSphere: "", rightCylinder: "", rightAxis: "", leftSphere: "", leftCylinder: "", leftAxis: "", rightEquiv: "0.00", leftEquiv: "0.00"};
        $scope.search = angular.copy(defaultForm); //{};

        $scope.searchResults = [];
        $scope.prevSearches = [];
        $scope.showPrevSearches = false;
        $scope.noResults = false;
        $scope.dominantMatch = '';

        var search = $scope.search;
        var sIDcount = 0;

        search.rightEquiv = search.leftEquiv = '0.00';
        
        $scope.calculateRightEquiv = function(model) {
            var rcyl = floatParse(model.rightCylinder);
            var rsph = floatParse(model.rightSphere); 
            var unroundedRight = sphericalEquiv(rcyl, rsph);
            
            model.unrightEquiv = unroundedRight;
            model.rightEquiv = roundEquiv(unroundedRight);
        };

        $scope.calculateLeftEquiv = function(model) {
            var lcyl = floatParse(model.leftCylinder);
            var lsph = floatParse(model.leftSphere);
            var unroundedLeft = sphericalEquiv(lcyl, lsph);
            
            model.unLeftEquiv = unroundedLeft;
            model.leftEquiv = roundEquiv(unroundedLeft);
        };

        $scope.searchGlasses = function (srch) {  
            //srch = obj representation of search
            //example: {"rightSphere":"2.200","rightEquiv":"3.25","rightCylinder":"2.3","rightAxis":"5","leftSphere":"2","leftEquiv":"5.50","leftCylinder":"7","leftAxis":"6"}

            // parse+validate values
            var revSrch = { //revised/validated search
                sID: srch.sID || ++sIDcount,
                dominantEye: srch.dominantEye,
                rightSphere: floatParse(srch.rightSphere),
                rightCylinder: floatParse(srch.rightCylinder),
                rightAxis: axisParse(srch.rightAxis),
                rightEquiv: floatParse(srch.rightEquiv),
                leftSphere: floatParse(srch.leftSphere),
                leftCylinder: floatParse(srch.leftCylinder),
                leftAxis: axisParse(srch.leftAxis),
                leftEquiv: floatParse(srch.leftEquiv)
            };

            var axisMinFunc = function(axis) { return (axis < 15) ? 0 : (axis < 165) ? axis-15 : 165; };
            var axisMaxFunc = function(axis) { return (axis > 165) ? 180 : (axis > 15) ? axis+15 : 15; };
            var searchObjFunc = function(equiv, cyl, axis) {
                return {
                    equivMin: equiv,
                    equivMax: equiv+1,
                    cylinderMin: cyl-0.75,
                    cylinderMax: cyl+0.75,
                    axisMin: axisMinFunc(axis),
                    axisMax: axisMaxFunc(axis)
                };
            };

            // search by filtering localDB for <value>
                //spherical equivalent = x to x+1
                //cylinder = (x-.75)<x<(x+.75)
                //axis = group 1 (0-15 or 165-180)
                //axis = group 2 (16-164) (x-15)<x<(x+15)
            // then <value>
            var searchObj;
            switch(revSrch.dominantEye) {
                case 'Right':
                    searchObj = searchObjFunc(revSrch.rightEquiv, revSrch.rightCylinder, revSrch.rightAxis);
                    inventoryService.lookupDomRight(searchObj);
                    break;
                case 'Left':
                    searchObj = searchObjFunc(revSrch.leftEquiv, revSrch.leftCylinder, revSrch.leftAxis);
                    inventoryService.lookupDomLeft(searchObj);
                    break;
                case 'None':
                    var rightObj = searchObjFunc(revSrch.rightEquiv, revSrch.rightCylinder, revSrch.rightAxis);
                    var leftObj = searchObjFunc(revSrch.leftEquiv, revSrch.leftCylinder, revSrch.leftAxis);
                    inventoryService.lookupDomNone(rightObj, leftObj);
                    break;
                default:
                    searchObj = searchObjFunc(revSrch.rightEquiv, revSrch.rightCylinder, revSrch.rightAxis);
                    inventoryService.lookupDomRight(searchObj);
            }

            setTimeout(function () {
                // console.log("SEARCH RESULTS RETRIEVE: ", Date.now());
                $scope.searchResults = inventoryService.getSearchResults();
                $scope.dominantMatch = revSrch.dominantEye;
                $scope.noResults = ($scope.searchResults.length) ? false : true;
                console.log("Search results: " + $scope.searchResults.length + " pairs found.");
                $scope.$apply();

                // update timeout after first search
                if (!firstSearch) { firstSearch = true; searchTimeoutDelay = 500; }
            }, searchTimeoutDelay);
            // reset the form -- clear all text fields
            // this.resetForm();

            // add search to previous searches list
            var prev = $scope.prevSearches;
            var prevsID = prev.filter(function(obj) { return obj.sID == revSrch.sID; });
            if (!prevsID.length) $scope.prevSearches.push(revSrch);
        };

        $scope.takeGlasses = function(pair) {
            console.log("Taking pair #" + pair.number + " out of search results.");
            inventoryService.take(pair.number);
            pair.available = false;
        };

        $scope.isMatch = function(key, cellData) {
            return ($scope.search[key] == cellData);
        };

        $scope.togglePrevSearches = function() {
            $scope.showPrevSearches = !$scope.showPrevSearches;
        };

        $scope.resetForm = function() {
            $scope.searchForm.$setPristine();
            $scope.search = angular.copy(defaultForm);
            $scope.search.rightEquiv = $scope.search.leftEquiv = '0.00';

            $scope.searchResults = [];
            $scope.dominantMatch = '';
            $scope.noResults = false;
        };
    });

    app.controller('inventoryCtrl', function ($scope, inventoryService) {
        var defaultForm = { number: "" };
        $scope.find = angular.copy(defaultForm);
        $scope.showhideTaken = false;
        $scope.showhideAvail = false;

        $scope.model = {};

        $scope.model.takenPairs = [];
        $scope.model.availablePairs = [];

        $scope.takePair = function(numPair) {
            inventoryService.take(numPair);

            // manually update view after small delay
            setTimeout(function() {
                $scope.$apply();
            }, invTimeoutDelay);
        };

        $scope.putbackPair = function(numPair) {
            inventoryService.putback(numPair);

            // manually update view after small delay
            setTimeout(function() {
                $scope.$apply();
            }, invTimeoutDelay);
        };

        $scope.toggleTaken = function() { $scope.showhideTaken = !$scope.showhideTaken; };
        $scope.toggleAvail = function() { $scope.showhideAvail = !$scope.showhideAvail; };

        // update taken pairs when DB is updated
        $scope.$watchCollection(
            function watchTaken(scope) {
                return inventoryService.getTaken();
            },
            function handleChange(newTaken, oldTaken) {
                // update only if pair array has changed (pair removed/added)
                if (newTaken.length !== oldTaken.length) {
                    // console.log("taken pairs was updated: ", newTaken);
                    // console.log("taken watch update: ", Date.now());
                    $scope.model.takenPairs = newTaken;
                }
            }
        );

        // update available pairs when DB is updated
        $scope.$watchCollection(
            function watchAvailable(scope) {
                return inventoryService.getAvailable();
            },
            function handleChange(newAvail, oldAvail) {
                // update only if pair array has changed (pair removed/added)
                if (newAvail.length !== oldAvail.length) {
                    // console.log("avail pairs was updated: ", newAvail);
                    // console.log("avail watch update: ", Date.now());
                    $scope.model.availablePairs = newAvail;
                }
            }
        );
    });

    app.directive('fileModel', ['$parse', function($parse) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                var model = $parse(attrs.fileModel);
                var modelSetter = model.assign;

                element.bind('change', function() {
                    scope.$apply(function() {
                        modelSetter(scope, element[0].files[0]);
                    });
                });
            }
        };
    }]);

    app.controller('importCtrl', function ($scope, inventoryService) {
        var formData = new FormData();
        var defaultForm = { rightSphere: "", rightCylinder: "", rightAxis: "", rightADD: "", leftSphere: "", leftCylinder: "", leftAxis: "", leftADD: "" };

        $scope.add = angular.copy(defaultForm); 

        $scope.inventory = inventoryService;
        $scope.addedGlasses = [];

        function importCSV(file) {
            var tempNextNum = $scope.inventory.getPairNumber();
            var rowCount = 0;

            // parse/read in CSV file
            Papa.parse(file, {
                dynamicTyping: true,
                skipEmptyLines: true,
                // preview: 100, 
                step: function(results, parser) {
                    // add rows past row 0
                    if (rowCount && results.data) {
                        // console.log("Parse row data: ", results.data);
                        $scope.importCSVAdd(results.data[0], tempNextNum);
                        tempNextNum++;
                    }
                    rowCount++;
                },
                complete: function(results, file) {
                    // console.log("Parsing complete:", results, file);
                },
                error: function(error) {
                    console.log("Import CSV: Error encountered:", error);
                }
            });
        }

        function importJSON(file) {
            var tempNextNum = $scope.inventory.getPairNumber();
            var fr = new FileReader();
            fr.onload = function(e) {
                var contents = e.target.result;
                var glasses = JSON.parse(contents);

                glasses.forEach(function (el, idx, arr) {
                    el.pairNumber = tempNextNum;

                    $scope.addedGlasses.push(el);
                    $scope.inventory.add(el);
                    tempNextNum++;
                });

                $scope.inventory.update();
            };
            fr.readAsText(file);
        }

        // Assumes 16 columnn CSV data
        $scope.importCSVAdd = function(input, nextNum) {
            var parsePairNum = function(inStr) { return parseInt(inStr.replace( /^\D+/g, '')); };
            var parseSetLetter = function(inStr) { return inStr.replace(/\d+$/g, ''); };
            var parseAvail = function(inStr) {
                var s = inStr.toLowerCase();
                switch(s) {
                    case 'no':
                        return true;
                    case 'yes':
                        return false;
                    default:
                        return true;
                }
            };

            // check if input.pairNumber vs nextPairNum
            // if input < nextNum: assign nextNum
            // else if input >= nextNum: use input number
            var inputNum = parsePairNum(input[14]);
            var pairNum = (inputNum < nextNum) ? nextNum : inputNum;

            var pair = {
                setLetter: parseSetLetter(input[14]),
                pairNumber: pairNum,
                data: {
                    rightSphere: input[0],
                    rightCylinder: input[1],
                    rightEquivUnround: input[2],
                    rightEquiv: input[3],
                    rightAxis: input[4],
                    rightADD: input[6],
                    leftSphere: input[7],
                    leftCylinder: input[8],
                    leftEquivUnround: input[9],
                    leftEquiv: input[10],
                    leftAxis: input[11],
                    leftADD: input[13]
                },
                available: parseAvail(input[15])
            };
            // console.log("ImportCSV Add:", pair);

            // add to added glasses
            $scope.addedGlasses.push(pair);
            $scope.inventory.add(pair);
        };

        $scope.manualAdd = function(input) {
            var inv = $scope.inventory;

             // calculate spherical equivalents (rounded+unrounded)
            var unroundR = sphericalEquiv(floatParse(input.rightCylinder), floatParse(input.rightSphere));
            var unroundL = sphericalEquiv(floatParse(input.leftCylinder), floatParse(input.leftSphere));
            
            var roundR = roundEquiv(unroundR);
            var roundL = roundEquiv(unroundL);

            var pair = {
                pairNumber: inv.getPairNumber(),
                data: {
                    rightSphere: floatParse(input.rightSphere),
                    rightCylinder: floatParse(input.rightCylinder),
                    rightEquivUnround: unroundR,
                    rightEquiv: roundR,
                    rightAxis: axisParse(input.rightAxis),
                    rightADD: floatParse(input.rightADD),
                    leftSphere: floatParse(input.leftSphere),
                    leftCylinder: floatParse(input.leftCylinder),
                    leftEquivUnround: unroundL,
                    leftEquiv: roundL,
                    leftAxis: axisParse(input.leftAxis),
                    leftADD: floatParse(input.leftADD)
                },
                available: true
            };

            // add to added glasses
            $scope.addedGlasses.push(pair);
            inv.add(pair);

            // reset input form
            this.resetForm();
        };
        
        $scope.resetForm = function() {
            $scope.manualAddForm.$setPristine();
            $scope.add = angular.copy(defaultForm);
        };

        $scope.import = function() {
            var file = $scope.importFile;
            if (file) {
                console.log("Import file:", file.name);
                // console.log("Import file: ", file);
                if (file.type == "text/csv") {
                    importCSV(file);
                } else if (file.type == "application/json") {
                    importJSON(file);
                }

                setTimeout(function() {
                    $scope.$apply();
                }, 3500);
            } else {
                console.log("Import file: No file to import.");
            }
        };
    });

    app.controller('exportCtrl', function ($scope, inventoryService) {
        function saveFile(data, dataType, fileName) {
            var a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none";

            var blob = new Blob([data], {type: dataType});
            var url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
        }

        function csvify(inArr) {
            inArr.forEach(function (element, idx, arr) {
                var dbObj = arr[idx];
                arr[idx] = simpleCSV(dbObj);
            });
            return Papa.unparse(inArr);
        }

        function jsonify(inArr) {
            inArr.forEach(function (element, idx, arr) {
                var dbObj = arr[idx];
                arr[idx] = simpleObj(dbObj);
            });
            return JSON.stringify(inArr);
        }

        var simpleObj = function(dbObj) {
            var obj = {
                pairNumber: dbObj.number,
                data: dbObj.data,
                available: dbObj.available,
                setLetter: dbObj.set
            };
            return obj;
        };

        var simpleCSV = function(dbObj) {
            var data = dbObj.data;
            var pNum = dbObj.set + '' + dbObj.number;
            return {
                rightSphere: data.rightSphere,
                rightCylinder: data.rightCylinder,
                rightEquivUnround: data.rightEquivUnround,
                rightEquiv: data.rightEquiv,
                rightAxis: data.rightAxis,
                rightAxisRange: axisRange(data.rightAxis),
                rightADD: data.rightADD,
                leftSphere: data.leftSphere,
                leftCylinder: data.leftCylinder,
                leftEquivUnround: data.leftEquivUnround,
                leftEquiv: data.leftEquiv,
                leftAxis: data.leftAxis,
                leftAxisRange: axisRange(data.leftAxis),
                leftADD: data.leftADD,
                number: pNum,
                taken: takenStr(dbObj.available)
            };
        };

        // functions for: CSV, JSON
        // for: taken inventory, available inventory, full inventory
        $scope.exportCSV = function(getTaken, getAvailable) {
            var taken = (getTaken) ? inventoryService.getTaken() : [];
            var avail = (getAvailable) ? inventoryService.getAvailable() : [];
            var all = taken.concat(avail);

            var csv = csvify(all);
            saveFile(csv, "text/csv", "export.csv");
        };

        $scope.exportJSON = function(getTaken, getAvailable) {
            var taken = (getTaken) ? inventoryService.getTaken() : [];
            var avail = (getAvailable) ? inventoryService.getAvailable() : [];
            var all = taken.concat(avail);

            var json = jsonify(all);
            saveFile(json, "application/json", "export.json");
        };

        $scope.syncDB = function() {
            inventoryService.sync();
        };

        $scope.destroyDB = function() {
            inventoryService.destroy();
        };
    });
})();
