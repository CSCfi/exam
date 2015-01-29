(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("SettingsResource", ['$resource', function ($resource) {
            return {
                agreement: $resource(
                    "/agreement", null,
                    {
                        "query":    {method: "GET", isArray: false},
                        'update':   {method: 'PUT'}
                    }),
                settings: $resource(
                    "/settings", null,
                    {
                        "update": { method: 'PUT'}
                    }),
                hostname: $resource(
                    "/settings/hostname", null,
                    {
                        "get": { method: 'GET'}
                    })
            }
        }]);
}());