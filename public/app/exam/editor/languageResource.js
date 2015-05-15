(function() {
    'use strict';
    angular.module("exam.resources")
        .factory("LanguageRes", ['$resource', function($resource) {
            return {
                languages: $resource("/languages", null)
            }
        }]);
}());