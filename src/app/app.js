//(function () {

import angular from 'angular'
import { exportController, importController, inventoryController, searchController } from './components'
import inventoryService from './services/inventory'

const app = angular.module('glassesApp', []);
//const $scope = 

console.log("TYPEOF search:", searchController);
console.log("TYPEOF export:", exportController);
app.controller('glassesController', ['$scope', function ($scope) {
    this.tab = 1;
    this.setTab = function (tabId) { this.tab = tabId; };
    this.isSet = function (tabId) { return this.tab === tabId; };
}]);

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



app.factory('inventoryService', inventoryService);
app.controller('searchController', ['$scope', 'inventoryService', searchController]);//($scope, inventoryService));
app.controller('inventoryController', ['$scope', 'inventoryService', inventoryController]);//($scope, inventoryService));
app.controller('importController', ['$scope', 'inventoryService', importController]);//($scope, inventoryService));
app.controller('exportController', ['$scope', 'inventoryService', exportController]);//($scope, inventoryService));
/*
    // var roundEquiv = function(unrounded) {
    //     if (unrounded < 0) { return -1*(Math.round((-1*unrounded) * 4) / 4); }
    //     else { return (Math.round(unrounded * 4) / 4); }
    // };
    // var floatParse = function(floatNum) {
    //     var n = parseFloat(floatNum);
    //     return n || 0;
    // };
    // var axisParse = function(num) {
    //     var n = parseInt(num) || 0;
    //     if (n <= 0) { return 0; }
    //     else if (n > 180) { return num % 180; }
    //     else { return n; }
    // }; 
    // var axisStringParse = function(axisString) {
    //     if (Number.isInteger(axisString) || (typeof axisString !== 'string')) { return axisParse(axisString); }
    //     else {
    //         var axisNumStr = axisString.replace(/^\D+/g, '');
    //         return axisParse(axisNumStr);
    //     }
    // };
    // var addParse = function(addStr) {
    //     if (addStr == "-") return 0;
    //     else return addStr;
    // };
    // var sphericalEquiv = function(cylinder, sphere) {
    //     return ((cylinder * 0.5) + sphere);
    // };
*/
    /** string helpers for "Export" only **/
/*
    // var axisRange = function(axisNum) {
    //     if (axisNum > 121) { return "high"; }
    //     else if (axisNum > 61) { return "mid"; }
    //     else if (axisNum >= 0) { return "low"; }
    //     else { return ""; }
    // };
    // var takenStr = function(availableBool) {
    //     if (availableBool) { return "No"; }
    //     else { return "Yes"; }
    // };

    // const invTimeoutDelay = 500;
    // let firstSearch = false;
    // let searchTimeoutDelay = 2000;
*/
/*
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
            const now = Date.now();
            const pairNumStr = 'pair-' + glassesObj.pairNumber.toString();
            let pair = {
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
                console.log("Add pair: Error when adding pair to database.", err, pair);
                if (err.status == '409') {
                    updateNextNum(_invAllLength+1);
                }
            }).then(function() {
                updateNextNum(++_nextPairNum);
            });
        };

        // 
        //  Update pair of glasses in PouchDB database
        //    pairNum: pair #,
        //    availableBool: bool to set pair availability (true=Not Taken, false=Taken)
        // 
        var updatePairDB = function(pairNum, availableBool) {
            const pairStr = 'pair-' + pairNum.toString();

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
                _nextPairNum = num;
                return localDB.put(id);
            }).catch(function (err) {
                if (err.status == "409") {
                    if (_nextPairNum == num) {
                        updateNextNum(_nextPairNum);
                        console.log("Update next_num: next_num updated after bulk operation");
                        // console.log("_nextPairNum",_nextPairNum);
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
            console.log("Available->Taken: Pair #" + pairNum);
            updatePairDB(pairNum, false);
        };

        // taken --> available glasses
        inventory.putback = function(pairNum) {
            console.log("Taken->Available: Pair #" + pairNum);
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

    app.controller('glassesController', function ($scope) {
        this.tab = 1;
        this.setTab = function (tabId) { this.tab = tabId; };
        this.isSet = function (tabId) { return this.tab === tabId; };
    });
*/
/*
    // app.controller('searchCtrl', function ($scope, inventoryService) {
    //     const defaultForm = { dominantEye: "Right", rightSphere: "", rightCylinder: "", rightAxis: "", leftSphere: "", leftCylinder: "", leftAxis: "", rightEquiv: "0.00", leftEquiv: "0.00"};
    //     $scope.search = angular.copy(defaultForm); //{};

    //     $scope.searchResults = [];
    //     $scope.prevSearches = [];
    //     $scope.showPrevSearches = false;
    //     $scope.noResults = false;
    //     $scope.dominantMatch = '';

    //     var search = $scope.search;
    //     var sIDcount = 0;

    //     search.rightEquiv = search.leftEquiv = '0.00';
        
    //     $scope.calculateRightEquiv = function(model) {
    //         var rcyl = floatParse(model.rightCylinder);
    //         var rsph = floatParse(model.rightSphere); 
    //         var unroundedRight = sphericalEquiv(rcyl, rsph);
            
    //         model.unrightEquiv = unroundedRight;
    //         model.rightEquiv = roundEquiv(unroundedRight);
    //     };

    //     $scope.calculateLeftEquiv = function(model) {
    //         var lcyl = floatParse(model.leftCylinder);
    //         var lsph = floatParse(model.leftSphere);
    //         var unroundedLeft = sphericalEquiv(lcyl, lsph);
            
    //         model.unLeftEquiv = unroundedLeft;
    //         model.leftEquiv = roundEquiv(unroundedLeft);
    //     };

    //     $scope.previousSearch = function(prevSrch) {
    //         $scope.search = {
    //             patientName: prevSrch.patientName,
    //             dominantEye: prevSrch.dominantEye,
    //             rightSphere: prevSrch.rightSphere,
    //             rightCylinder: prevSrch.rightCylinder,
    //             rightAxis: prevSrch.rightAxis,
    //             rightEquiv: prevSrch.rightEquiv,
    //             leftSphere: prevSrch.leftSphere,
    //             leftCylinder: prevSrch.leftCylinder,
    //             leftAxis: prevSrch.leftAxis,
    //             leftEquiv: prevSrch.leftEquiv,
    //         }
    //         $scope.searchGlasses(prevSrch);
    //     };

    //     $scope.searchGlasses = function (srch) {  
    //         //srch = obj representation of search
    //         //example: {"rightSphere":"2.200","rightEquiv":"3.25","rightCylinder":"2.3","rightAxis":"5","leftSphere":"2","leftEquiv":"5.50","leftCylinder":"7","leftAxis":"6"}

    //         // parse+validate values
    //         $scope.searchLoadingIcon = true;

    //         var revSrch = { //revised/validated search
    //             sID: srch.sID || ++sIDcount,
    //             patientName: srch.patientName,
    //             dominantEye: srch.dominantEye,
    //             rightSphere: floatParse(srch.rightSphere),
    //             rightCylinder: floatParse(srch.rightCylinder),
    //             rightAxis: axisParse(srch.rightAxis),
    //             rightEquiv: floatParse(srch.rightEquiv),
    //             leftSphere: floatParse(srch.leftSphere),
    //             leftCylinder: floatParse(srch.leftCylinder),
    //             leftAxis: axisParse(srch.leftAxis),
    //             leftEquiv: floatParse(srch.leftEquiv)
    //         };

    //         var axisMinFunc = function(axis) { return (axis <= 15) ? 0 : (axis < 165) ? axis-15 : 165; };
    //         var axisMaxFunc = function(axis) { return (axis >= 165) ? 180 : (axis > 15) ? axis+15 : 15; };
    //         var searchObjFunc = function(equiv, cyl, axis) {
    //             return {
    //                 equivMin: equiv,
    //                 equivMax: equiv+1,
    //                 cylinderMin: cyl-0.75,
    //                 cylinderMax: cyl+0.75,
    //                 axisMin: axisMinFunc(axis),
    //                 axisMax: axisMaxFunc(axis)
    //             };
    //         };

    //         // search by filtering localDB for <value>
    //             //spherical equivalent = x to x+1
    //             //cylinder = (x-.75)<x<(x+.75)
    //             //axis = group 1 (0-15 or 165-180)
    //             //axis = group 2 (16-164) (x-15)<x<(x+15)
    //         // then <value>

    //         var searchObj;
    //         switch(revSrch.dominantEye) {
    //             case 'Right':
    //                 searchObj = searchObjFunc(revSrch.rightEquiv, revSrch.rightCylinder, revSrch.rightAxis);
    //                 inventoryService.lookupDomRight(searchObj);
    //                 break;
    //             case 'Left':
    //                 searchObj = searchObjFunc(revSrch.leftEquiv, revSrch.leftCylinder, revSrch.leftAxis);
    //                 inventoryService.lookupDomLeft(searchObj);
    //                 break;
    //             case 'None':
    //                 var rightObj = searchObjFunc(revSrch.rightEquiv, revSrch.rightCylinder, revSrch.rightAxis);
    //                 var leftObj = searchObjFunc(revSrch.leftEquiv, revSrch.leftCylinder, revSrch.leftAxis);
    //                 inventoryService.lookupDomNone(rightObj, leftObj);
    //                 break;
    //             default:
    //                 searchObj = searchObjFunc(revSrch.rightEquiv, revSrch.rightCylinder, revSrch.rightAxis);
    //                 inventoryService.lookupDomRight(searchObj);
    //         }

    //         setTimeout(function () {
    //             // console.log("SEARCH RESULTS RETRIEVE: ", Date.now());
    //             $scope.searchResults = inventoryService.getSearchResults();
    //             $scope.dominantMatch = revSrch.dominantEye;
    //             $scope.noResults = ($scope.searchResults.length) ? false : true;
    //             $scope.searchLoadingIcon = false;
    //             // console.log("Search results: " + $scope.searchResults.length + " pairs found.");
    //             $scope.$apply();


    //             // update timeout after first search
    //             if (!firstSearch) { firstSearch = true; searchTimeoutDelay = 500; }
    //         }, searchTimeoutDelay);
    //         // reset the form -- clear all text fields
    //         // this.resetForm();

    //         // add search to previous searches list
    //         var prev = $scope.prevSearches;
    //         var prevsID = prev.filter(function(obj) { return obj.sID == revSrch.sID; });
    //         if (!prevsID.length) $scope.prevSearches.push(revSrch);
    //     };

    //     // Search By Spherical Equivalent (values)
    //     $scope.searchBySE = function(srch) {
    //         // use spherical equivalent values as new sphere values
    //         search.rightSphere = srch.rightSphere = srch.rightEquiv;
    //         search.leftSphere = srch.leftSphere = srch.leftEquiv;

    //         // clear cylinder and axis values
    //         srch.rightCylinder = srch.leftCylinder = "0.00"
    //         srch.rightAxis = srch.leftAxis = "0"

    //         $scope.searchGlasses(srch)
    //     }

    //     $scope.takeGlasses = function(pair) {
    //         console.log("Taking pair #" + pair.number + " out of search results.");
    //         inventoryService.take(pair.number);
    //         pair.available = false;
    //     };

    //     $scope.isMatch = function(key, cellData) {
    //         return ($scope.search[key] == cellData);
    //     };

    //     $scope.togglePrevSearches = function() {
    //         $scope.showPrevSearches = !$scope.showPrevSearches;
    //     };

    //     $scope.resetForm = function() {
    //         $scope.searchForm.$setPristine();
    //         $scope.search = angular.copy(defaultForm);
    //         $scope.search.rightEquiv = $scope.search.leftEquiv = '0.00';

    //         $scope.searchResults = [];
    //         $scope.dominantMatch = '';
    //         $scope.noResults = false;
    //     };

    //     $scope.searchFormatFloat = function(inputName) {
    //         switch(inputName) {
    //             case 'rightSphere':
    //                 $scope.search.rightSphere = formatFloat($scope.search.rightSphere);
    //                 break;
    //             case 'rightCylinder':
    //                 $scope.search.rightCylinder = formatFloat($scope.search.rightCylinder);
    //                 break;
    //             case 'leftSphere':
    //                 $scope.search.leftSphere = formatFloat($scope.search.leftSphere);
    //                 break;
    //             case 'leftCylinder':
    //                 $scope.search.leftCylinder = formatFloat($scope.search.leftCylinder);
    //                 break;
    //         }
    //     }
    // });
*/
/*
    // app.controller('inventoryCtrl', function ($scope, inventoryService) {
    //     const defaultForm = { number: "" };
    //     $scope.find = angular.copy(defaultForm);
    //     $scope.showhideTaken = false;
    //     $scope.showhideAvail = false;

    //     $scope.model = {};

    //     $scope.model.takenPairs = [];
    //     $scope.model.availablePairs = [];

    //     $scope.clearSearch = function() {
    //         $scope.find.number = "";
    //     };

    //     $scope.takePair = function(numPair) {
    //         inventoryService.take(numPair);

    //         // manually update view after small delay
    //         setTimeout(function() {
    //             $scope.$apply();
    //         }, invTimeoutDelay);
    //     };

    //     $scope.putbackPair = function(numPair) {
    //         inventoryService.putback(numPair);

    //         // manually update view after small delay
    //         setTimeout(function() {
    //             $scope.$apply();
    //         }, invTimeoutDelay);
    //     };

    //     $scope.toggleTaken = function() { $scope.showhideTaken = !$scope.showhideTaken; };
    //     $scope.toggleAvail = function() { $scope.showhideAvail = !$scope.showhideAvail; };

    //     // update taken pairs when DB is updated
    //     $scope.$watchCollection(
    //         function watchTaken(scope) {
    //             return inventoryService.getTaken();
    //         },
    //         function handleChange(newTaken, oldTaken) {
    //             // update only if pair array has changed (pair removed/added)
    //             if (newTaken.length !== oldTaken.length) {
    //                 // console.log("taken pairs was updated: ", newTaken);
    //                 // console.log("taken watch update: ", Date.now());
    //                 $scope.model.takenPairs = newTaken;
    //             }
    //         }
    //     );

    //     // update available pairs when DB is updated
    //     $scope.$watchCollection(
    //         function watchAvailable(scope) {
    //             return inventoryService.getAvailable();
    //         },
    //         function handleChange(newAvail, oldAvail) {
    //             // update only if pair array has changed (pair removed/added)
    //             if (newAvail.length !== oldAvail.length) {
    //                 // console.log("avail pairs was updated: ", newAvail);
    //                 // console.log("avail watch update: ", Date.now());
    //                 $scope.model.availablePairs = newAvail;
    //             }
    //         }
    //     );
    // });
*/

/*
    // app.controller('importCtrl', function ($scope, inventoryService) {
    //     var formData = new FormData();
    //     const defaultForm = { rightSphere: "", rightCylinder: "", rightAxis: "", rightADD: "", leftSphere: "", leftCylinder: "", leftAxis: "", leftADD: "" };

    //     $scope.add = angular.copy(defaultForm); 

    //     $scope.inventory = inventoryService;
    //     $scope.addedGlasses = [];
    //     $scope.importLoadingIcon = false;

    //     var parsePairNum = function(inStr) {
    //         if (typeof inStr !== 'string') inStr = inStr.toString();
    //         return parseInt(inStr.replace( /^\D+/g, '')); 
    //     };
    //     var parseSetLetter = function(inStr) {
    //         if (typeof inStr !== 'string') return '';
    //         return inStr.replace(/\d+$/g, '');
    //     };
    //     var parseAvail = function(inStr) {
    //         if (!inStr || (typeof inStr !== 'string')) { return true; }
    //         else {
    //             var s = inStr.toLowerCase();
    //             switch(s) {
    //                 case 'no':
    //                     return true;
    //                 case 'yes':
    //                     return false;
    //                 default:
    //                     return true;
    //             }
    //         }
    //     };

    //     //TODO: fix so it isn't hacky AF
    //     var noDataCheck = function(inArr) {
    //         var newArr = inArr.slice();
    //         if (newArr.length == 9) {
    //             newArr.pop(); // remove number
    //         } else if (newArr.length == 10) {
    //             var first = newArr[0];
    //             // console.log(first);
    //             if (typeof first === 'string') {
    //                 // first col is a pair number/ID
    //                 newArr.shift(); // remove number
    //             } else {
    //                 // taken status is a column
    //                 newArr.pop();
    //                 newArr.pop();
    //             }
    //         } else if (newArr.length == 11) {
    //             newArr.shift(); // remove number
    //         }
    //         var arrStr = newArr.toString();
    //         var emptyStr = arrStr.replace(/,/g, "");
    //         if (emptyStr == "") return true;
    //         else return false;
    //     };

    //     function importCSV(file) {
    //         csvNextNum = $scope.inventory.getPairNumber();
    //         var tempNextNum = $scope.inventory.getPairNumber();
    //         var rowCount = 0;

    //         // parse/read in CSV file
    //         Papa.parse(file, {
    //             dynamicTyping: true,
    //             skipEmptyLines: true,
    //             // preview: 100, 
    //             step: function(results, parser) {
    //                 // add rows past row 0
    //                 if (rowCount && results.data) {
    //                     // console.log("Parse row data: ", results.data);
    //                     // console.log("row: ", rowCount, results.data[0], noDataCheck(results.data[0]));
    //                     // if (!noDataCheck(results.data[0])) {
    //                         // console.log("row results", results);
    //                         // if (tempNextNum < 300) console.log(tempNextNum);
    //                         $scope.importCSVAdd(results.data[0], tempNextNum);
    //                         tempNextNum++;
    //                     // } else {
    //                         // console.log("Import CSV: Row "+rowCount+" skipped due to no glasses data.");
    //                     // }
    //                 }
    //                 rowCount++;
    //             },
    //             complete: function(results, file) {
    //                 // console.log("Parsing complete:", results, file);
    //                 $scope.importLoadingIcon = false;
    //             },
    //             error: function(error) {
    //                 console.log("Import CSV: Error encountered:", error);
    //                 $scope.importLoadingIcon = false;
    //             }
    //         });
    //     }

    //     function importJSON(file) {
    //         var tempNextNum = $scope.inventory.getPairNumber();
    //         var fr = new FileReader();
    //         fr.onload = function(e) {
    //             var contents = e.target.result;
    //             var glasses = JSON.parse(contents);

    //             glasses.forEach(function (el, idx, arr) {
    //                 el.pairNumber = tempNextNum;

    //                 $scope.addedGlasses.push(el);
    //                 $scope.inventory.add(el);
    //                 tempNextNum++;
    //             });

    //             $scope.inventory.update();
    //             $scope.importLoadingIcon = false;
    //         };
    //         fr.readAsText(file);
    //     }

    //     function nineColumnImport(input, nextNum) {
    //         // rightSphere, rightCylinder, rightAxis, rightAdd, leftSphere, leftCylinder, leftAxis, leftAdd, number

    //         // check if input.pairNumber vs nextPairNum
    //         // if input < nextNum: assign nextNum
    //         // else if input >= nextNum: use input number
    //         var inputNum = parsePairNum(input[8]);
    //         var pairNum = (inputNum < nextNum) ? nextNum : inputNum;
    //         if (!inputNum) { return {}; }

    //         var unroundR = sphericalEquiv(floatParse(input[1]), floatParse(input[0]));
    //         var unroundL = sphericalEquiv(floatParse(input[5]), floatParse(input[4]));

    //         var roundR = roundEquiv(unroundR);
    //         var roundL = roundEquiv(unroundL);

    //         var rightCyl = floatParse(input[1]);
    //         var leftCyl = floatParse(input[5]);

    //         var data = {};

    //         // Negative cylinder?
    //         // newSphere = sph + f;
    //         // newCylinder = Math.abs(f);
    //         // newAxis = axisParse(axis+90);

    //         if (rightCyl < 0) {
    //             data.rightSphere = floatParse(input[0]) + rightCyl;
    //             data.rightCylinder = Math.abs(rightCyl);
    //             data.rightEquivUnround = unroundR;
    //             data.rightEquiv = roundR;
    //             data.rightAxis = axisParse(axisStringParse(input[2])+90);
    //             data.rightADD = addParse(input[3]);
    //         } else {
    //             data.rightSphere = floatParse(input[0]);
    //             data.rightCylinder = rightCyl;
    //             data.rightEquivUnround = unroundR;
    //             data.rightEquiv = roundR;
    //             data.rightAxis = axisStringParse(input[2]);
    //             data.rightADD = addParse(input[3]);
    //         }

    //         if (leftCyl < 0) {
    //             data.leftSphere = floatParse(input[4]) + leftCyl;
    //             data.leftCylinder = Math.abs(leftCyl);
    //             data.leftEquivUnround = unroundL;
    //             data.leftEquiv = roundL;
    //             data.leftAxis = axisParse(axisStringParse(input[6])+90);
    //             data.leftADD = addParse(input[7]);
    //         } else {
    //             data.leftSphere = floatParse(input[4]);
    //             data.leftCylinder = leftCyl;
    //             data.leftEquivUnround = unroundL;
    //             data.leftEquiv = roundL;
    //             data.leftAxis = axisStringParse(input[6]);
    //             data.leftADD = addParse(input[7]);
    //         }

    //         var pair = {
    //             setLetter: parseSetLetter(input[8]),
    //             pairNumber: pairNum,
    //             data: data,
    //             available: parseAvail(input[9])
    //         };

    //         return pair;
    //     }

    //     function elevenColumnImport(input, nextNum) {
    //         // Pair/ID number,
    //         // Right Sphere, Right Cylinder, Right Axis, Right Add, Right Trifocal
    //         // Left Sphere, Left Cylinder, Left Axis, Left Add, Left Trifocal

    //         // check if input.pairNumber vs nextPairNum
    //         // if input < nextNum: assign nextNum
    //         // else if input >= nextNum: use input number
    //         var inputNum = parsePairNum(input[0]);
    //         var pairNum = (inputNum < nextNum) ? nextNum : inputNum;
    //         if (!inputNum) { return {}; }

    //         var unroundR = sphericalEquiv(floatParse(input[2]), floatParse(input[1]));
    //         var unroundL = sphericalEquiv(floatParse(input[7]), floatParse(input[6]));

    //         var roundR = roundEquiv(unroundR);
    //         var roundL = roundEquiv(unroundL);

    //         var biAddR = floatParse(input[4]);
    //         var triAddR = floatParse(input[5]);
    //         var biAddL = floatParse(input[9]);
    //         var triAddL = floatParse(input[10]);
    //         var addR = (biAddR > triAddR) ? biAddR : triAddR;
    //         var addL = (biAddL > triAddL) ? biAddL : triAddL;

    //         var rightCyl = floatParse(input[2]);
    //         var leftCyl = floatParse(input[7]);

    //         var data = {};
    //         if (rightCyl < 0) {
    //             data.rightSphere = floatParse(input[1]) + rightCyl;
    //             data.rightCylinder = Math.abs(rightCyl);
    //             data.rightEquivUnround = unroundR;
    //             data.rightEquiv = roundR;
    //             data.rightAxis = axisParse(axisStringParse(input[3])+90);
    //             data.rightADD = addR;
    //         } else {
    //             data.rightSphere = floatParse(input[1]);
    //             data.rightCylinder = rightCyl;
    //             data.rightEquivUnround = unroundR;
    //             data.rightEquiv = roundR;
    //             data.rightAxis = axisStringParse(input[3]);
    //             data.rightADD = addR;
    //         }

    //         if (leftCyl < 0) {
    //             data.leftSphere = floatParse(input[6]) + leftCyl;
    //             data.leftCylinder = Math.abs(leftCyl);
    //             data.leftEquivUnround = unroundL;
    //             data.leftEquiv = roundL;
    //             data.leftAxis = axisParse(axisStringParse(input[8])+90);
    //             data.leftADD = addL;
    //         } else {
    //             data.leftSphere = floatParse(input[6]);
    //             data.leftCylinder = leftCyl;
    //             data.leftEquivUnround = unroundL;
    //             data.leftEquiv = roundL;
    //             data.leftAxis = axisStringParse(input[8]);
    //             data.leftADD = addL;
    //         }

    //         var pair = {
    //             setLetter: parseSetLetter(input[0]),
    //             pairNumber: pairNum,
    //             data: data,
    //             available: true
    //         };

    //         return pair;
    //     }

    //     function sixteenColumnImport(input, nextNum) {
    //         // Right Sphere, Right Cylinder, Right SE Unrounded, Right SE Rounded, Right Axis, Right Axis Range, Right Add,
    //         // Left Sphere, Left Cylinder, Left SE Unrounded, Left SE Rounded, Left Axis, Left Axis Range, Left Add,
    //         // Pair Number, Taken Status

    //         // check if input.pairNumber vs nextPairNum
    //         // if input < nextNum: assign nextNum
    //         // else if input >= nextNum: use input number
    //         var inputNum = parsePairNum(input[14]);
    //         var pairNum = (inputNum < nextNum) ? nextNum : inputNum;
    //         if (!inputNum) { return {}; }

    //         // rightSphere: floatParse(input[0]),
    //         // rightCylinder: floatParse(input[1]),
    //         // rightEquivUnround: floatParse(input[2]),
    //         // rightEquiv: floatParse(input[3]),
    //         // rightAxis: axisStringParse(input[4]),
    //         // rightADD: addParse(input[6]),
    //         // leftSphere: floatParse(input[7]),
    //         // leftCylinder: floatParse(input[8]),
    //         // leftEquivUnround: floatParse(input[9]),
    //         // leftEquiv: floatParse(input[10]),
    //         // leftAxis: axisStringParse(input[11]),
    //         // leftADD: addParse(input[13])

    //         var rightCyl = floatParse(input[1]);
    //         var leftCyl = floatParse(input[8]);

    //         var data = {};
    //         if (rightCyl < 0) {
    //             data.rightSphere = floatParse(input[0]) + rightCyl;
    //             data.rightCylinder = Math.abs(rightCyl);
    //             data.rightEquivUnround = floatParse(input[2]);
    //             data.rightEquiv = floatParse(input[3]);
    //             data.rightAxis = axisParse(axisStringParse(input[4])+90);
    //             data.rightADD = addParse(input[6]);
    //         } else {
    //             data.rightSphere = floatParse(input[0]);
    //             data.rightCylinder = rightCyl;
    //             data.rightEquivUnround = floatParse(input[2]);
    //             data.rightEquiv = floatParse(input[3]);
    //             data.rightAxis = axisStringParse(input[4]);
    //             data.rightADD = addParse(input[6]);
    //         }

    //         if (leftCyl < 0) {
    //             data.leftSphere = floatParse(input[7]) + leftCyl;
    //             data.leftCylinder = Math.abs(leftCyl);
    //             data.leftEquivUnround = floatParse(input[9]);
    //             data.leftEquiv = floatParse(input[10]);
    //             data.leftAxis = axisParse(axisStringParse(input[11])+90);
    //             data.leftADD = addParse(input[13]);
    //         } else {
    //             data.leftSphere = floatParse(input[7]);
    //             data.leftCylinder = leftCyl;
    //             data.leftEquivUnround = floatParse(input[9]);
    //             data.leftEquiv = floatParse(input[10]);
    //             data.leftAxis = axisStringParse(input[11]);
    //             data.leftADD = addParse(input[13]);
    //         }

    //         var pair = {
    //             setLetter: parseSetLetter(input[14]),
    //             pairNumber: pairNum,
    //             data: data, 
    //             available: parseAvail(input[15])
    //         };

    //         return pair;
    //     }

    //     // Assumes 9 columnn CSV data
    //     // rightSphere, rightCylinder, rightAxis, rightAdd, leftSphere, leftCylinder, leftAxis, leftAdd, number
    //     $scope.importCSVAdd = function(input, nextNum) {
    //         var emptyObjCompare = function(obj) { return JSON.stringify(obj) == JSON.stringify({}); }
    //         var pair = {};
    //         if (input.length == 9 || input.length == 10) { pair = nineColumnImport(input, nextNum); }
    //         else if (input.length == 11 || input.length == 12) { pair = elevenColumnImport(input, nextNum); }
    //         else if (input.length == 16) { pair = sixteenColumnImport(input, nextNum); }
    //         // console.log("ImportCSV Add:", pair);

    //         // add to added glasses
    //         // console.log(input);
    //         // console.log(input.length);
    //         if (emptyObjCompare(pair)) {
    //             // no pair data, skip row
    //             // if (emptyObjCompare(pair.data)) {
    //             //     console.log("Error adding pair #"+pair.pairNumber+": Row skipped due to no glasses data.");
    //             // } else {
    //                 console.log("Error adding pair: No pair # found. Please check data columns.");
    //             // }
    //         }
    //         else {
    //             $scope.addedGlasses.push(pair);
    //             $scope.inventory.add(pair);
    //         }
    //     };

    //     $scope.manualAdd = function(input) {
    //         var inv = $scope.inventory;

    //          // calculate spherical equivalents (rounded+unrounded)
    //         var unroundR = sphericalEquiv(floatParse(input.rightCylinder), floatParse(input.rightSphere));
    //         var unroundL = sphericalEquiv(floatParse(input.leftCylinder), floatParse(input.leftSphere));
            
    //         var roundR = roundEquiv(unroundR);
    //         var roundL = roundEquiv(unroundL);

    //         var rightCyl = floatParse(input.rightCylinder);
    //         var leftCyl = floatParse(input.leftCylinder);
    //         var data = {};

    //         // rightSphere: floatParse(input.rightSphere),
    //         // rightCylinder: floatParse(input.rightCylinder),
    //         // rightEquivUnround: unroundR,
    //         // rightEquiv: roundR,
    //         // rightAxis: axisParse(input.rightAxis),
    //         // rightADD: floatParse(input.rightADD),
    //         // leftSphere: floatParse(input.leftSphere),
    //         // leftCylinder: floatParse(input.leftCylinder),
    //         // leftEquivUnround: unroundL,
    //         // leftEquiv: roundL,
    //         // leftAxis: axisParse(input.leftAxis),
    //         // leftADD: floatParse(input.leftADD)

    //         // Negative cylinder? 
    //         // newSphere = sph + f;
    //         // newCylinder = Math.abs(f);
    //         // newAxis = axisParse(axis+90);

    //         if (rightCyl < 0) {
    //             data.rightSphere = floatParse(input.rightSphere) + rightCyl;
    //             data.rightCylinder = Math.abs(rightCyl);
    //             data.rightEquivUnround = unroundR;
    //             data.rightEquiv = roundR;
    //             data.rightAxis = axisParse(axisParse(input.rightAxis) + 90);
    //             data.rightADD = floatParse(input.rightADD);
    //         } else {
    //             data.rightSphere = floatParse(input.rightSphere);
    //             data.rightCylinder = rightCyl;
    //             data.rightEquivUnround = unroundR;
    //             data.rightEquiv = roundR;
    //             data.rightAxis = axisParse(input.rightAxis);
    //             data.rightADD = floatParse(input.rightADD);
    //         }

    //         if (leftCyl < 0) {
    //             data.leftSphere = floatParse(input.leftSphere) + leftCyl;
    //             data.leftCylinder = Math.abs(leftCyl);
    //             data.leftEquivUnround = unroundL;
    //             data.leftEquiv = roundL;
    //             data.leftAxis = axisParse(axisParse(input.leftAxis) + 90);
    //             data.leftADD = floatParse(input.leftADD);
    //         } else { 
    //             data.leftSphere = floatParse(input.leftSphere);
    //             data.leftCylinder = leftCyl;
    //             data.leftEquivUnround = unroundL;
    //             data.leftEquiv = roundL;
    //             data.leftAxis = axisParse(input.leftAxis);
    //             data.leftADD = floatParse(input.leftADD);
    //         }

    //         var pair = {
    //             pairNumber: inv.getPairNumber(),
    //             data: data,
    //             available: true
    //         };

    //         // add to added glasses
    //         $scope.addedGlasses.push(pair);
    //         inv.add(pair);

    //         // reset input form
    //         this.resetAddForm();
    //     };
        
    //     $scope.resetAddForm = function() {
    //         $scope.manualAddForm.$setPristine();
    //         $scope.add = angular.copy(defaultForm);
    //     };

    //     $scope.resetUploadForm = function() {
    //         $scope.importFile = null;
    //         $scope.uploadFileForm.$setPristine();
    //     };

    //     $scope.import = function() {
    //         var file = $scope.importFile;
    //         $scope.importLoadingIcon = true;
    //         if (file) {
    //             console.log("Import file:", file.name, file.type);
    //             // console.log("Import file: ", file);
    //             if (file.type == "text/csv" || file.type.indexOf("vnd.ms-excel") > -1 ||
    //                 file.type.indexOf("spreadsheetml") > -1 ||
    //                 file.type == "application/excel" || file.type == "application/vnd.msexcel") {
    //                 console.log("Import file: Importing CSV ", file.name, file.type);
    //                 importCSV(file);
    //             } else if (file.type == "application/json") {
    //                 console.log("Import file: Importing JSON ", file.name, file.type);
    //                 importJSON(file);
    //             } else if (file.name.indexOf('.csv') === file.name.length - 4) {
    //                 console.log("Import file: Could not confirm CSV file type but found .csv file extension. Attempting to import as CSV ", file.name)
    //                 importCSV(file);
    //             } else {
    //                 console.log("Import file: Improper file format. Upload aborted.", file.name, file.type);
    //             }

    //             setTimeout(function() {
    //                 $scope.resetUploadForm();
    //                 $scope.$apply();
    //             }, 3500);
    //         } else {
    //             console.log("Import file: No file to import.");
    //         }
    //     };

    //     // adds sig figs to numbers
    //     $scope.addFormatFloat = function(inputName) {
    //         switch(inputName) {
    //             case 'rightSphere':
    //                 $scope.add.rightSphere = formatFloat($scope.add.rightSphere);
    //                 break;
    //             case 'rightCylinder':
    //                 $scope.add.rightCylinder = formatFloat($scope.add.rightCylinder);
    //                 break;
    //             case 'rightADD':
    //                 $scope.add.rightADD = formatFloat($scope.add.rightADD);
    //                 break;
    //             case 'leftSphere':
    //                 $scope.add.leftSphere = formatFloat($scope.add.leftSphere);
    //                 break;
    //             case 'leftCylinder':
    //                 $scope.add.leftCylinder = formatFloat($scope.add.leftCylinder);
    //                 break;
    //             case 'leftADD':
    //                 $scope.add.leftADD = formatFloat($scope.add.leftADD);
    //                 break;
    //         }
    //     }
    // });
*/
/*
    // app.controller('exportCtrl', function ($scope, inventoryService) {
    //     var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    //     var date = new Date();
    //     var dateString = "-" + date.getDate() + months[date.getMonth()] + date.getFullYear();

    //     function saveFile(data, dataType, fileName) {
    //         var a = document.createElement("a");
    //         document.body.appendChild(a);
    //         a.style = "display: none";

    //         var blob = new Blob([data], {type: dataType});
    //         var url = window.URL.createObjectURL(blob);
    //         a.href = url;
    //         a.download = fileName;
    //         a.click();
    //         window.URL.revokeObjectURL(url);
    //     }

    //     function csvify(inArr, opt_compact) {
    //         inArr.forEach(function (element, idx, arr) {
    //             var dbObj = arr[idx];
    //             if (opt_compact) { arr[idx] = tenCSV(dbObj); }
    //             else { arr[idx] = sixteenCSV(dbObj); }
    //         });
    //         return Papa.unparse(inArr);
    //     }

    //     function jsonify(inArr) {
    //         inArr.forEach(function (element, idx, arr) {
    //             var dbObj = arr[idx];
    //             arr[idx] = simpleObj(dbObj);
    //         });
    //         return JSON.stringify(inArr);
    //     }

    //     var sortGlassesPairs = function(a, b) {
    //         return parseInt(a.number) - parseInt(b.number);
    //     };

    //     var simpleObj = function(dbObj) {
    //         var obj = {
    //             pairNumber: dbObj.number,
    //             data: dbObj.data,
    //             available: dbObj.available,
    //             setLetter: dbObj.set
    //         };
    //         return obj;
    //     };

    //     var sixteenCSV = function(dbObj) {
    //         var data = dbObj.data;
    //         var pNum = dbObj.set + '' + dbObj.number;
    //         return {
    //             rightSphere: data.rightSphere,
    //             rightCylinder: data.rightCylinder,
    //             rightEquivUnround: data.rightEquivUnround,
    //             rightEquiv: data.rightEquiv,
    //             rightAxis: data.rightAxis,
    //             rightAxisRange: axisRange(data.rightAxis),
    //             rightADD: data.rightADD,
    //             leftSphere: data.leftSphere,
    //             leftCylinder: data.leftCylinder,
    //             leftEquivUnround: data.leftEquivUnround,
    //             leftEquiv: data.leftEquiv,
    //             leftAxis: data.leftAxis,
    //             leftAxisRange: axisRange(data.leftAxis),
    //             leftADD: data.leftADD,
    //             number: pNum,
    //             taken: takenStr(dbObj.available)
    //         };
    //     };

    //     var tenCSV = function(dbObj) {
    //         var data = dbObj.data;
    //         var pNum = dbObj.set + '' + dbObj.number;
    //         return {
    //             rightSphere: data.rightSphere,
    //             rightCylinder: data.rightCylinder,
    //             rightAxis: data.rightAxis,
    //             rightADD: data.rightADD,
    //             leftSphere: data.leftSphere,
    //             leftCylinder: data.leftCylinder,
    //             leftAxis: data.leftAxis,
    //             leftADD: data.leftADD,
    //             number: pNum,
    //             taken: takenStr(dbObj.available)
    //         };
    //     };

    //     // functions for: CSV, JSON
    //     // for: taken inventory, available inventory, full inventory
    //     $scope.exportCSV = function(getTaken, getAvailable, opt_compact) {
    //         var taken = (getTaken) ? inventoryService.getTaken() : [];
    //         var avail = (getAvailable) ? inventoryService.getAvailable() : [];
    //         var all = taken.concat(avail);
    //         all.sort(sortGlassesPairs)

    //         var csv = csvify(all, opt_compact);
    //         var filename;
    //         if (opt_compact) filename = "export-compact" + dateString + ".csv";
    //         else filename = "export-full" + dateString + ".csv";
    //         saveFile(csv, "text/csv", filename);
    //     };

    //     $scope.exportJSON = function(getTaken, getAvailable) {
    //         var taken = (getTaken) ? inventoryService.getTaken() : [];
    //         var avail = (getAvailable) ? inventoryService.getAvailable() : [];
    //         var all = taken.concat(avail);
    //         all.sort(sortGlassesPairs)

    //         var json = jsonify(all);
    //         saveFile(json, "application/json", "export" + dateString + ".json");
    //     };

    //     $scope.syncDB = function() {
    //         inventoryService.sync();
    //     };

    //     $scope.destroyDB = function() {
    //         inventoryService.destroy();
    //     };
    // });
//})();
*/

module.exports = { app }
