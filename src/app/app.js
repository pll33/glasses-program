
import angular from 'angular';
import 'angular-translate';
import 'angular-translate-storage-cookie';
import 'angular-translate-storage-local';
import { exportController, importController, inventoryController, searchController } from './components';
import inventoryService from './services/inventory';
import translateService from './services/translate';

const app = angular.module('glassesApp', ['pascalprecht.translate']);

app.config(['$translateProvider', translateService]);

app.controller('glassesController', ['$scope', '$translate', function ($scope, $translate) {

    // last modified date
    this.lastModifiedDate = 'May 25, 2018';

    // tab settings
    this.tab = 1;
    this.setTab = function (tabId) { this.tab = tabId; };
    this.isTab = function (tabId) { return this.tab === tabId; };

    // translation settings
    $translate.use('en');
    this.programLanguage = 'en';
    this.setProgramLanguage = function(languageKey) {
        this.programLanguage = languageKey;
        $translate.use(languageKey);
    };

}]);

app.directive('fileModel', ['$parse', function($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            let model = $parse(attrs.fileModel);
            let modelSetter = model.assign;

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

