(function () {
    'use strict';
    angular.module("sitnet.resources")
        .factory("CourseRes", ['$resource', function ($resource) {
            return {
                course: $resource("/courses/:id",
                    {
                        id: "@id"
                    }
                ),
                courses: $resource("/courses"),
                userCourses: $resource("/courses/user/:id", {id: "@id"})
            }
        }]);
}());