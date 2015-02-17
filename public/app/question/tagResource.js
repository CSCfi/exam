(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("TagRes", ['$resource', function ($resource) {
            return {
                tags: $resource("/tags", null,
                    {
                        "query": {method: "GET", isArray: true},
                        "create": {method: "POST"}
                    }),
                tag: $resource("/tags/:tid",
                    {tid: "@tid"},
                    {
                        "remove": {method: "DELETE"}
                    }),
                question: $resource("/tags/:tid/:qid",
                    {tid: "@tid", qid: "@qid"},
                    {
                        "add": {method: "PUT"},
                        "remove": {method: "DELETE"}
                    })
            }
        }]);
}());