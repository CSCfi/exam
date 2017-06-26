'use strict';
angular.module('app.common')
    .factory('Language', ['$resource', function ($resource) {
        return {
            languages: $resource('/app/languages', null)
        };
    }]);
