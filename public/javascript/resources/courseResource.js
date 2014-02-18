'use strict';

angular.module("sitnet.resources")
    .factory("CourseRes", ['$resource', function ($resource) {
        return $resource(
            "/courses/:id",
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