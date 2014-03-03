(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("StudentExamRes", ['$resource', function ($resource) {
            return $resource(
                "/student/exams/:id",
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
}());