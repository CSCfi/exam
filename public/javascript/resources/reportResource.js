(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("ReportResource", ['$resource', function ($resource) {
            return {
                resbydate: $resource(
                    "/statistics/resbydate/:roomId/:from/:to",
                    {
                        id: "@roomId",
                        from: "@from",
                        to: "@to"
                    },
                    {
                        "get": {method: "GET", params: {id: "@roomId", from: "@from", to: "@to"}}
                    }),
                examnames: $resource(
                    "/statistics/examnames", null,
                    {

                    })
            }
        }]);
}());