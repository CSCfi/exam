'use strict';

angular.module("sitnet.resources")
    .factory("ExamRes", ['$resource', function ($resource) {
        return $resource(
            "/exams/:id",
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