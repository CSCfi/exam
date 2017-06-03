(function() {
    'use strict';
    angular.module('app.exam')
        .factory("LanguageRes", ['$resource', function($resource) {
            return {
                languages: $resource("/app/languages", null)
            };
        }]);
}());
