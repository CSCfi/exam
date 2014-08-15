(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("SettingsResource", ['$resource', function ($resource) {
            return {
                settings: $resource(
                    "/agreament/:id", null,
                    {
                        "query":    {method: "GET", isArray: false},
//                        "get ":    {method: "GET", params: {id: "@id"}},
                        'update':   {method: 'PUT', params: { id: '@id'}}
                    })
            }
        }]);
}());