(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("ExamMachineResource", ['$resource', function ($resource) {
            return $resource(
                "/machines/:id",
                {
                    id: "@id"
                },
                {
                    "update": {method: "PUT"}
                }
            );
        }]);
}());