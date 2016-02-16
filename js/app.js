(function () {
    var app = angular.module('glasses', []);
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
        if (n <= 0) return 0;
        else if (n > 180) return num % 180; 
        else return n;
    }; 
    var sphericalEquiv = function(cylinder, sphere) {
        return ((cylinder * 0.5) + sphere);
    };

    app.factory('inventoryService', function() {
        var inventory = {
            invAll: [],
            invTaken: [],
            invAvailable: []
        };
        var getPairIdx = function(arr, pairNum) {
            var idx = arr.map(function(x) {return x.pairNumber; }).indexOf(pairNum);
            return idx;
        };

        // add to inventory from xls/xlsx/csv import
        inventory.import = function(obj) {
            // add all pairs to all
            // figure out where to sort taken/available glasses
        };

        // add to inventory from manual input
        // NOTE: assumes all glasses from manual input are available (=NOT taken)
        inventory.add = function(obj) {
            this.invAll.push(obj);
            this.invAvailable.push(obj);
        };

        // export inventory as csv/json
        inventory.export = function(obj) {

        };

        // search for matching available glasses in _available
        inventory.lookup = function(searchObj) {

        };

        // available -> taken glasses
        inventory.take = function(pairNum) {
            // remove from _available, add to _taken
            var idx = getPairIdx(this.invAvailable, pairNum);
            var pair = this.invAvailable.splice(idx, 1)[0];
            if (pair) this.invTaken.push(pair);
        };

        // taken --> available glasses
        inventory.putback = function(pairNum) {
            //remove from _taken, add to _available
            var idx = getPairIdx(this.invTaken, pairNum);
            var pair = this.invTaken.splice(idx, 1)[0];
            if (pair) this.invAvailable.push(pair);
        };

        inventory.generatePairNumber = function() {
            if (this.invAll.length) {
                // update highest pair number in inventory
                var inv = this.invAll;
                var arr = inv.map(function(g) { return g.pairNumber; });
                _lastPairNum = Math.max.apply(Math, arr);
            }

            // return lastPairNum + 1
            return ++_lastPairNum;
        };
        return inventory;
    });

    app.controller('glassesController', function () {
        this.tab = 1;

        this.setTab = function (tabId) {
            this.tab = tabId;
        };

        this.isSet = function (tabId) {
            return this.tab === tabId;
        };
    });

    app.controller('searchController', function ($scope, inventoryService) {
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

            // search by filtering db for <value>

            // then <value>


            // list glasses matching search
            // $scope.results = 

            // reset the form -- clear all text fields
            this.resetForm();

            // add search to previous searches list
            var prev = $scope.prevSearches;
            var prevsID = prev.filter(function(obj) { return obj.sID == revSrch.sID });
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

    app.controller('inventoryController', function ($scope, inventoryService) {
        var defaultForm = { pairNumber: "" };
        $scope.find = angular.copy(defaultForm);
        
        $scope.inventory = inventoryService;
        $scope.takenPairs = inventoryService.invTaken;
        $scope.availablePairs = inventoryService.invAvailable;
    });

    app.controller('importController', function ($scope, inventoryService) {
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
            };

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
    });

})();