
export function exportController($scope, $inventoryService) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var date = new Date();
    var dateString = "-" + date.getDate() + months[date.getMonth()] + date.getFullYear();

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

    function csvify(inArr, opt_compact) {
        inArr.forEach(function (element, idx, arr) {
            var dbObj = arr[idx];
            if (opt_compact) { arr[idx] = tenCSV(dbObj); }
            else { arr[idx] = sixteenCSV(dbObj); }
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

    var sortGlassesPairs = function(a, b) {
        return parseInt(a.number) - parseInt(b.number);
    };

    var simpleObj = function(dbObj) {
        var obj = {
            pairNumber: dbObj.number,
            data: dbObj.data,
            available: dbObj.available,
            setLetter: dbObj.set
        };
        return obj;
    };

    var sixteenCSV = function(dbObj) {
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

    var tenCSV = function(dbObj) {
        var data = dbObj.data;
        var pNum = dbObj.set + '' + dbObj.number;
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

    // functions for: CSV, JSON
    // for: taken inventory, available inventory, full inventory
    $scope.exportCSV = function(getTaken, getAvailable, opt_compact) {
        var taken = (getTaken) ? $inventoryService.getTaken() : [];
        var avail = (getAvailable) ? $inventoryService.getAvailable() : [];
        var all = taken.concat(avail);
        all.sort(sortGlassesPairs)

        var csv = csvify(all, opt_compact);
        var filename;
        if (opt_compact) filename = "export-compact" + dateString + ".csv";
        else filename = "export-full" + dateString + ".csv";
        saveFile(csv, "text/csv", filename);
    };

    $scope.exportJSON = function(getTaken, getAvailable) {
        var taken = (getTaken) ? $inventoryService.getTaken() : [];
        var avail = (getAvailable) ? $inventoryService.getAvailable() : [];
        var all = taken.concat(avail);
        all.sort(sortGlassesPairs)

        var json = jsonify(all);
        saveFile(json, "application/json", "export" + dateString + ".json");
    };

    $scope.syncDB = function() {
        $inventoryService.sync();
    };

    $scope.destroyDB = function() {
        $inventoryService.destroy();
    };
}

exportController.$inject = ['$scope', 'inventoryService'];
