'use strict';

angular.module("sitnet.resources")
    .factory("ExamRes", ['$resource', function ($resource) {
        return $resource(
            "/exam/:id",
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