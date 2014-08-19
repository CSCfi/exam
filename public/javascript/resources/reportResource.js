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
                        "get":    {method: "GET", params: {id: "@roomId", from: "@from", to: "@to"}}
                    }),
                examAttachment: $resource(
                    "/attachment/exam/:id",
                    {
                        id: "@id"
                    },
                    {
                        "get":    {method: "GET", params: {id: "@id"}},
                        "insert": {method: "POST", params: { id: "@id"}},
                        "remove": {method: "DELETE", params: { id: "@id"}}
                    })
            }
        }]);
}());