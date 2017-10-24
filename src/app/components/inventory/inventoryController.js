
export function inventoryController($scope, $inventoryService) {

    const invTimeoutDelay = 500;
    const defaultForm = { number: "" };
    $scope.find = angular.copy(defaultForm);
    $scope.showhideTaken = false;
    $scope.showhideAvail = false;

    $scope.model = {};

    $scope.model.takenPairs = [];
    $scope.model.availablePairs = [];

    $scope.clearSearch = function() {
        $scope.find.number = "";
    };

    $scope.takePair = function(numPair) {
        $inventoryService.take(numPair);

        // manually update view after small delay
        setTimeout(function() {
            $scope.$apply();
        }, invTimeoutDelay);
    };

    $scope.putbackPair = function(numPair) {
        $inventoryService.putback(numPair);

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
            return $inventoryService.getTaken();
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
            return $inventoryService.getAvailable();
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
}

inventoryController.$inject = ['$scope', 'inventoryService'];
