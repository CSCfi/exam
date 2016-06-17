(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("TagRes", ['$resource', function ($resource) {
            return {
                tags: $resource("/app/tags", null,
                    {
                        "query": {method: "GET", isArray: true},
                        "add": {
                            method: "POST", interceptor: {
                                // Expose the whole response to be able to dig out the success status code
                                response: function (response) {
                                    return response;
                                }
                            }
                        }
                    }),
                tag: $resource("/app/tags/:tid",
                    {tid: "@tid"},
                    {
                        "remove": {method: "DELETE"}
                    }),
                question: $resource("/app/tags/:tid/:qid",
                    {tid: "@tid", qid: "@qid"},
                    {
                        "add": {method: "PUT"},
                        "remove": {method: "DELETE"}
                    })
            };
        }]);
}());
