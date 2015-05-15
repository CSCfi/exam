(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("ExamMachineResource", ['$resource', function ($resource) {
            return $resource(
                "/machines/:id",
                {
                    id: "@id"
                },
                {
                    "get": {method: "GET"},
                    "update": {method: "PUT"},
                    "insert": {method: "POST"},
                    "remove": {method: "DELETE"}
                }
            );
        }]);
}());