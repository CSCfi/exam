(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("TagRes", ['$resource', function ($resource) {
            return {
                tags: $resource("/app/tags")
            };
        }]);
}());
