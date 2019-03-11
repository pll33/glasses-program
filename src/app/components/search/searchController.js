import angular from 'angular';
import { roundEquiv, sphericalEquiv, axisParse, floatParse, formatFloat } from '../../utils';

export function searchController($scope, $inventoryService) {
    const defaultForm = { dominantEye: 'Right', rightSphere: '', rightCylinder: '', rightAxis: '', leftSphere: '', leftCylinder: '', leftAxis: '', rightEquiv: '0.00', leftEquiv: '0.00'};
    $scope.search = angular.copy(defaultForm);

    $scope.searchResults = [];
    $scope.prevSearches = [];
    $scope.showPrevSearches = false;
    $scope.noResults = false;
    $scope.dominantMatch = '';

    let firstSearch = false;
    let searchTimeoutDelay = 2000;

    let search = $scope.search;
    let sIDcount = 0;

    search.rightEquiv = search.leftEquiv = '0.00';
    
    $scope.calculateRightEquiv = function(model) {
        const rcyl = floatParse(model.rightCylinder);
        const rsph = floatParse(model.rightSphere); 
        const unroundedRight = sphericalEquiv(rcyl, rsph);
        
        model.unrightEquiv = unroundedRight;
        model.rightEquiv = formatFloat(roundEquiv(unroundedRight));
    };

    $scope.calculateLeftEquiv = function(model) {
        const lcyl = floatParse(model.leftCylinder);
        const lsph = floatParse(model.leftSphere);
        const unroundedLeft = sphericalEquiv(lcyl, lsph);
        
        model.unLeftEquiv = unroundedLeft;
        model.leftEquiv = formatFloat(roundEquiv(unroundedLeft));
    };

    $scope.previousSearch = function(prevSrch) {
        $scope.search = {
            patientName: prevSrch.patientName,
            dominantEye: prevSrch.dominantEye,
            rightSphere: prevSrch.rightSphere,
            rightCylinder: prevSrch.rightCylinder,
            rightAxis: prevSrch.rightAxis,
            rightEquiv: prevSrch.rightEquiv,
            leftSphere: prevSrch.leftSphere,
            leftCylinder: prevSrch.leftCylinder,
            leftAxis: prevSrch.leftAxis,
            leftEquiv: prevSrch.leftEquiv,
        };

        $scope.searchGlasses(prevSrch);
    };

    $scope.searchGlasses = function (srch) {  
        //srch = obj representation of search
        //example: {'rightSphere':'2.200','rightEquiv':'3.25','rightCylinder':'2.3','rightAxis':'5','leftSphere':'2','leftEquiv':'5.50','leftCylinder':'7','leftAxis':'6'}

        // clear old search results
        $scope.searchResults = [];

        // parse+validate values
        $scope.searchLoadingIcon = true;

        const revSrch = { //revised/validated search
            sID: srch.sID || ++sIDcount,
            patientName: srch.patientName,
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

        let axisMinFunc = function(axis) { return (axis <= 15) ? 0 : (axis < 165) ? axis-15 : 165; };
        let axisMaxFunc = function(axis) { return (axis >= 165) ? 180 : (axis > 15) ? axis+15 : 15; };
        let searchObjFunc = function(equiv, cyl, axis) {
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

        let searchObj, rightObj, leftObj;
        switch(revSrch.dominantEye) {
        case 'Right':
            searchObj = searchObjFunc(revSrch.rightEquiv, revSrch.rightCylinder, revSrch.rightAxis);
            $inventoryService.lookupDomRight(searchObj);
            break;
        case 'Left':
            searchObj = searchObjFunc(revSrch.leftEquiv, revSrch.leftCylinder, revSrch.leftAxis);
            $inventoryService.lookupDomLeft(searchObj);
            break;
        case 'None':
            rightObj = searchObjFunc(revSrch.rightEquiv, revSrch.rightCylinder, revSrch.rightAxis);
            leftObj = searchObjFunc(revSrch.leftEquiv, revSrch.leftCylinder, revSrch.leftAxis);
            $inventoryService.lookupDomNone(rightObj, leftObj);
            break;
        default:
            searchObj = searchObjFunc(revSrch.rightEquiv, revSrch.rightCylinder, revSrch.rightAxis);
            $inventoryService.lookupDomRight(searchObj);
        }

        setTimeout(function () {
            $scope.searchResults = $inventoryService.getSearchResults();
            $scope.dominantMatch = revSrch.dominantEye;
            $scope.noResults = ($scope.searchResults.length) ? false : true;
            $scope.searchLoadingIcon = false;
            // console.log('Search results: ' + $scope.searchResults.length + ' pairs found.');
            $scope.$apply();

            // update timeout after first search
            if (!firstSearch) { firstSearch = true; searchTimeoutDelay = 500; }
        }, searchTimeoutDelay);
        // reset the form -- clear all text fields
        // this.resetForm();

        // add search to previous searches list
        let prev = $scope.prevSearches;
        let prevsID = prev.filter(function(obj) { return obj.sID == revSrch.sID; });
        if (!prevsID.length) $scope.prevSearches.push(revSrch);
    };

    // Search By Spherical Equivalent (values)
    $scope.searchBySE = function(srch) {
        // use spherical equivalent values as new sphere values
        search.rightSphere = srch.rightSphere = srch.rightEquiv;
        search.leftSphere = srch.leftSphere = srch.leftEquiv;

        // clear cylinder and axis values
        srch.rightCylinder = srch.leftCylinder = '0.00';
        srch.rightAxis = srch.leftAxis = '0';

        $scope.searchGlasses(srch);
    };

    $scope.takeGlasses = function(pair) {
        console.log('Taking pair #' + pair.number + ' out of search results.');
        $inventoryService.take(pair.number);
        pair.available = false;
    };

    $scope.toggleTemporaryStatus = function(row) {
        let index = row.$index;
        let resultsTableEl = document.getElementById('tableSearchResults');
        let rowCell = resultsTableEl.children[1].children[index].children[0];
        let cellClasses = rowCell.classList;

        if (cellClasses.value.indexOf('tempstatus-match') > -1) {
            cellClasses.remove('tempstatus-match');
            cellClasses.add('tempstatus-nomatch');
        } else if (cellClasses.value.indexOf('tempstatus-nomatch') > -1) {
            cellClasses.remove('tempstatus-nomatch');
        } else {
            cellClasses.add('tempstatus-match');
        }
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

    $scope.searchFormatFloat = function(inputName) {
        switch(inputName) {
        case 'rightSphere':
            $scope.search.rightSphere = formatFloat($scope.search.rightSphere);
            break;
        case 'rightCylinder':
            $scope.search.rightCylinder = formatFloat($scope.search.rightCylinder);
            break;
        case 'leftSphere':
            $scope.search.leftSphere = formatFloat($scope.search.leftSphere);
            break;
        case 'leftCylinder':
            $scope.search.leftCylinder = formatFloat($scope.search.leftCylinder);
            break;
        }
    };
}

searchController.$inject = ['$scope', 'inventoryService'];
