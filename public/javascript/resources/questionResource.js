'use strict';

angular.module("sitnet.resources")
    .factory("QuestionRes", ['$resource', function ($resource) {
        return $resource(
            "/mc-questions/:id",
            {
                id: "@id"
            },
            {
                "update": {
                    method: "PUT"
                }
            }
        );
    }]);