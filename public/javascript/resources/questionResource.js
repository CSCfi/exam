(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("QuestionRes", ['$resource', function ($resource) {
            return {
                questions: $resource("/questions/:id",
                {
                    id: "@id"
                },
                {
                    "update": {method: "PUT"},
                    "delete": {method: "DELETE", params: {id: "@id"}},
                    "create": {method: "GET"}

                }),
                options: $resource("/options/:id",
                {
                    id: "@id"
                },
                {
                    "update": {method: "PUT"},
                    "insert": {method: "POST", params: {qid: "@qid"}},
                    "create": {method: "GET"}

//                    "delete": {method: "DELETE", params: {qid: "@qid", oid: "@oid"}}
                })
            };
        }]);
}());
