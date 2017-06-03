(function () {
    'use strict';
    angular.module('app.exam')
        .factory("CourseRes", ['$resource', function ($resource) {
            return {
                course: $resource("/app/courses/:id",
                    {
                        id: "@id"
                    }
                ),
                courses: $resource("/app/courses"),
                userCourses: $resource("/app/courses/user")
            };
        }]);
}());
