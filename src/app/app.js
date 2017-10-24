
import angular from 'angular'
import { exportController, importController, inventoryController, searchController } from './components'
import inventoryService from './services/inventory'

const app = angular.module('glassesApp', []);

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
app.controller('searchController', ['$scope', 'inventoryService', searchController]);
app.controller('inventoryController', ['$scope', 'inventoryService', inventoryController]);
app.controller('importController', ['$scope', 'inventoryService', importController]);
app.controller('exportController', ['$scope', 'inventoryService', exportController]);

module.exports = { app }
