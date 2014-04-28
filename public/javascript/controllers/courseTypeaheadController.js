(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('CourseTypeaheadCtrl', function ($http, $scope, limitToFilter, CourseRes) {

            $scope.getCourses = function(filter, criteria) {
                return CourseRes.courses.query({filter: filter, q: criteria}).$promise.then(
                    function (courses) {
                        return limitToFilter(courses, 15);
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );
            };

            $scope.onCourseSelect = function ($item, $model, $label) {
               $scope.newExam.course = $item;
               $scope.courseCodeSearch = $item;
               $scope.courseNameSearch = $item;
            };

        });
}());
