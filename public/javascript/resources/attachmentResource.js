(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("AttachmentRes", ['$resource', function ($resource) {
            return {
                questionAttachment: $resource(
                    "/attachment/question/:id",
                    {
                        id: "@id"
                    },
                    {
                        "get":    {method: "GET", params: {id: "@id"}},
                        "insert": {method: "POST", params: {id: "@id"}},
                        "remove": {method: "DELETE", params: { id: "@id"}}
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