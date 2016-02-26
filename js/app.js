(function () {
    var app = angular.module('app', ['pouchdb', 'pascalprecht.translate']);

    var _lastPairNum = 0;
    var roundEquiv = function(unrounded) {
        return (Math.round(unrounded * 4) / 4);
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
            HELP: 'Help',
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
            HELP: 'ayuda',
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
        var remoteDB = new PouchDB('http://localhost:5984/glassesDB');;

        function initDB() {
            //  check if local database exists
            localDB.info().then(function (info) {
                console.log("InitDB: Local DB info below");
                console.log(info);
                console.log("--------------");
            });

            // check if remote exists
            remoteDB.info().then(function (info) {
                console.log("InitDB: Remote DB info below");
                console.log(info);
                console.log("--------------");
            });

            var lastNumDoc = {
                _id: 'last_num',
                number: _lastPairNum
            };

            // check if lastNum doc exists,
            // if exists - update lastNum
            // else - add doc for lastNum, init 1
            localDB.get('last_num').then(function(doc) {
                console.log("InitDB: last_num document already exists. Setting last_num to " + doc.number);
                _lastPairNum = doc.number;
            }).catch(function(err) {
                if (err && err.status == '404') {
                    localDB.put(lastNumDoc).then(function() {
                        console.log("InitDB: Added last_num document");
                    });
                } else {
                    console.log("InitDB: last_num document lookup error");
                    console.log(err);
                }
            });

            // check for indexes
            localDB.getIndexes().then(function (result) {

                if (result.indexes.length > 1) {
                    console.log("InitDB: Search indexes already exist.");
                } else {
                    console.log("InitDB: Search indexes do not exist, creating indexes...")

                    // create index for inventory (pouchdb-find)
                    localDB.createIndex({
                        index: {
                            fields: ['available', 'number'],
                            name: 'inventory'
                        }
                    });

                    localDB.createIndex({
                        index: {
                            fields: ['available', 'number'],
                            name: 'search'
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
                time_added: now,
                time_modified: now
            };

            localDB.put(pair).then(function() {
                // update last pair ID
                if (glassesObj.pairNumber > _lastPairNum) {
                    _lastPairNum = glassesObj.pairNumber;
                }

                console.log("Added glasses pair #: " + glassesObj.pairNumber);
                return localDB.get(pairNumStr);
            }).catch(function (err) {
                console.log(err);
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
            });
        };

        var updateLastNum = function() {
            var pairNum = ++_lastPairNum;
            localDB.get("last_num").then(function(id) {
                id.number = pairNum;
                return localDB.put(id);
            }).catch(function (err) {
                console.log(err);
            });
        };

        //TODO: Move logic from the map function to query()
        //http://pouchdb.com/2014/06/17/12-pro-tips-for-better-code-with-pouchdb.html
        // var createDesignDoc = function(name, mapFunction) {
        //   var ddoc = {
        //         _id: '_design/' + name,
        //         views: {
        //         }
        //     };
        //     ddoc.views[name] = { map: mapFunction.toString() };
        //     return ddoc;
        // };
        // var availableDoc = createDesignDoc('by_avail', function(doc) {
        //     emit(doc.available);
        // });
        // localDB.put(availableDoc);

        var queryTaken = function() {
            //return localDB.query('by_avail', {key: true });
            localDB.find({
                selector: {available: {$eq: false}},
                sort: [{number: 'asc'}]
            }).then(function(result) {
                return result;
            });
        };
        var queryAvailable = function() {
            //return localDB.query('by_avail', {key: false});
            localDB.find({
                selector: {available: {$eq: true}},
                sort: [{number: 'asc'}]
            }).then(function(result) {
                return result;
            });
        };

        // add to inventory from xls/xlsx/csv import
        inventory.import = function(pairListObj) {
            // add all pairs to all
            // figure out where to sort taken/available glasses
        };

        // add to inventory from manual input
        // NOTE: assumes all glasses from manual input are available (=NOT taken)
        inventory.add = function(obj) {
            addPairDB(obj);
        };

        // export inventory as csv/json
        inventory.exportAll = function() {
            var csv;

            // get all pair docs

            // compile into csv and return

        };

        inventory.exportTaken = function() {
            // get taken (queryTaken)

            // compile into csv and return
        };

        // search for matching available glasses in _available
        inventory.lookup = function(searchObj) {
            localDB.find({

            });
        };

        // available -> taken glasses
        inventory.take = function(pairNum) {
            updatePairDB(pairNum, false);
        };

        // taken --> available glasses
        inventory.putback = function(pairNum) {
            updatePairDB(pairNum, true);
        };

        inventory.generatePairNumber = function() {
            return ++_lastPairNum;
        };

        inventory.sync = function() {
            localDB.replicate.to(remoteDB).on('complete', function () {
              // yay, we're done!
              console.log("Local->Remote: Sync complete.")
            }).on('error', function (err) {
              // boo, something went wrong!

              console.log("Local->Remote: Sync error.");
              console.log(err);
            });
        };

        inventory.destroy = function() {
            localDB.destroy().then(function () {
                // double-check info
                localDB.info().then(function (info) {
                    console.log("Local DB info:");
                    console.log(info);
                    console.log("--------------");
                }).catch(function(err) {
                    // database actually destroyed
                    console.log("Local DB: Database successfully destroyed.");
                });
            }).catch(function (err) {
                console.log("Local DB: Destroy error");
                console.log(err);
            })
        };

        return inventory;
    });

    app.controller('glassesController', function ($scope, $translate) {
        this.tab = 1;

        this.setTab = function (tabId) {
            this.tab = tabId;
        };

        this.isSet = function (tabId) {
            return this.tab === tabId;
        };

        $scope.langPick = 'en';
        $scope.changeLanguage = function (key) {
            $translate.use(key);
            $scope.langPick = key;
        };
    });

    app.controller('searchCtrl', function ($scope, inventoryService) {
        var defaultForm = { dominantEye: "Right", rightSphere: "", rightCylinder: "", rightAxis: "", leftSphere: "", leftCylinder: "", leftAxis: "", rightEquiv: "0.00", leftEquiv: "0.00"};
        $scope.search = angular.copy(defaultForm); //{};
        $scope.results = [];
        $scope.prevSearches = [];
        $scope.showPrevSearches = false;
        $scope.showResults = false;

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
            $scope.results = [];
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

            // search by filtering localDB for <value>

            // then <value>


            // list glasses matching search
            // $scope.results = 

            // reset the form -- clear all text fields
            this.resetForm();

            // add search to previous searches list
            var prev = $scope.prevSearches;
            var prevsID = prev.filter(function(obj) { return obj.sID == revSrch.sID; });
            if (!prevsID.length) $scope.prevSearches.push(revSrch);

            // console.log("srch: " + JSON.stringify(srch));
            // console.log("rev: " + JSON.stringify(revSrch));
        };

        $scope.isMatch = function(frm, result) {

        };

        $scope.togglePrevSearches = function() {
            $scope.showPrevSearches = !$scope.showPrevSearches;
        };

        $scope.resetForm = function() {
            $scope.searchForm.$setPristine();
            $scope.search = angular.copy(defaultForm);
            $scope.search.rightEquiv = $scope.search.leftEquiv = '0.00';
        };
    });

    app.controller('inventoryCtrl', function ($scope, inventoryService) {
        var defaultForm = { pairNumber: "" };
        $scope.find = angular.copy(defaultForm);
        
        $scope.inventory = inventoryService;
        // $scope.takenPairs = inventoryService.invTaken;
        // $scope.availablePairs = inventoryService.invAvailable;

        // TODO: update taken pairs when DB is updated
        // TODO: update available pairs when DB is updated

    });

    app.controller('importCtrl', function ($scope, inventoryService) {
        var defaultForm = { rightSphere: "", rightCylinder: "", rightAxis: "", rightADD: "", leftSphere: "", leftCylinder: "", leftAxis: "", leftADD: "" };
        $scope.add = angular.copy(defaultForm); 

        $scope.inventory = inventoryService;
        $scope.addedGlasses = [];

        $scope.addToInventory = function(input) {
            var inv = $scope.inventory;

             // calculate spherical equivalents (rounded+unrounded)
            var unroundR = sphericalEquiv(floatParse(input.rightCylinder), floatParse(input.rightSphere));
            var unroundL = sphericalEquiv(floatParse(input.leftCylinder), floatParse(input.leftSphere));
            
            var roundR = roundEquiv(unroundR);
            var roundL = roundEquiv(unroundL);

            var pair = {
                pairNumber: inv.generatePairNumber(),
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

            //TODO: remove after dev
            // console.log("obj: " + JSON.stringify(glasses));

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

        $scope.importCSV = function() {
            Papa.parse("", {
                worker: true,
                dynamicTyping: true,
                step: function(row) {

                },
                complete: function() {

                }
            });
        };

        $scope.importJSON = function() {

        };
    });

    app.controller('exportCtrl', function ($scope, inventoryService) {
        //TODO:
        // functions for: exportXLSX, XLS, JSON, CSV
        // for: taken inventory, available inventory, full inventory

        $scope.syncDB = function() {
            inventoryService.sync();
        };

        $scope.destroyDB = function() {
            inventoryService.destroy();
        };
    });
})();
