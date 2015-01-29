(function() {
    'use strict';
    angular.module("sitnet.resources")
        .factory("LanguageRes", ['$resource', function($resource) {
            return {
                languages: $resource("/languages", null)
            }
        }]);
}());