import Papa from 'papaparse';

export function exportController($scope, $inventoryService) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const date = new Date();
    const dateString = '-' + date.getDate() + months[date.getMonth()] + date.getFullYear();

    function saveFile(data, dataType, fileName) {
        let a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';

        let blob = new Blob([data], {type: dataType});
        let url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    function csvify(inArr, opt_compact) {
        inArr.forEach(function (element, idx, arr) {
            let dbObj = arr[idx];
            if (opt_compact) { arr[idx] = tenCSV(dbObj); }
            else { arr[idx] = sixteenCSV(dbObj); }
        });
        return Papa.unparse(inArr);
    }

    function jsonify(inArr) {
        inArr.forEach(function (element, idx, arr) {
            let dbObj = arr[idx];
            arr[idx] = simpleObj(dbObj);
        });
        return JSON.stringify(inArr);
    }

    let axisRange = function(axisNum) {
        if (axisNum > 121) { return 'high'; }
        else if (axisNum > 61) { return 'mid'; }
        else if (axisNum >= 0) { return 'low'; }
        else { return ''; }
    };

    let takenStr = function(availableBool) {
        if (availableBool) { return 'No'; }
        else { return 'Yes'; }
    };

    let sortGlassesPairs = (a, b) => {
        parseInt(a.number) - parseInt(b.number);
    };

    let simpleObj = function(dbObj) {
        const obj = {
            pairNumber: dbObj.number,
            data: dbObj.data,
            available: dbObj.available,
            setLetter: dbObj.set
        };
        return obj;
    };

    let sixteenCSV = function(dbObj) {
        const data = dbObj.data;
        const pNum = dbObj.set + '' + dbObj.number;
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

    let tenCSV = function(dbObj) {
        const data = dbObj.data;
        const pNum = dbObj.set + '' + dbObj.number;
        return {
            rightSphere: data.rightSphere,
            rightCylinder: data.rightCylinder,
            rightAxis: data.rightAxis,
            rightADD: data.rightADD,
            leftSphere: data.leftSphere,
            leftCylinder: data.leftCylinder,
            leftAxis: data.leftAxis,
            leftADD: data.leftADD,
            number: pNum,
            taken: takenStr(dbObj.available)
        };
    };

    $scope.showExportOptions = false;
    $scope.toggleExportOptions = function() { $scope.showExportOptions = !$scope.showExportOptions; };

    // functions for: CSV, JSON
    // for: taken inventory, available inventory, full inventory
    $scope.exportCSV = function(getTaken, getAvailable, opt_compact) {
        let taken = (getTaken) ? $inventoryService.getTaken() : [];
        let avail = (getAvailable) ? $inventoryService.getAvailable() : [];
        let all = taken.concat(avail);
        all.sort(sortGlassesPairs);

        let csv = csvify(all, opt_compact);
        let filename;
        if (opt_compact) filename = `export-compact${dateString}.csv`;
        else filename = `export-full${dateString}.csv`;
        saveFile(csv, 'text/csv', filename);
    };

    $scope.exportJSON = function(getTaken, getAvailable) {
        let taken = (getTaken) ? $inventoryService.getTaken() : [];
        let avail = (getAvailable) ? $inventoryService.getAvailable() : [];
        let all = taken.concat(avail);
        all.sort(sortGlassesPairs);

        let json = jsonify(all);
        saveFile(json, 'application/json', `export${dateString}.json`);
    };

    $scope.syncDB = function() {
        $inventoryService.sync();
    };

    $scope.destroyDB = function() {
        $inventoryService.destroy();
    };
}

exportController.$inject = ['$scope', 'inventoryService'];
