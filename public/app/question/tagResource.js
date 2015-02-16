(function() {
    'use strict';
    angular.module("sitnet.resources")
        .factory("TagRes", ['$resource', function($resource) {
            return {
                tags: $resource("/tags", null)
            }
        }]);
}());