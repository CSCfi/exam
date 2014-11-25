(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('CourseTypeaheadCtrl', ['$http', '$scope', 'limitToFilter', 'CourseRes', 'ExamRes', '$translate',
            function ($http, $scope, limitToFilter, CourseRes, ExamRes, $translate) {

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

            $scope.onCourseSelect = function ($item, $model, $label, exam) {

                console.log($item);
                console.log($model);
                console.log($label);
                console.log(exam);

                ExamRes.course.update({eid: exam.id, cid: $item.id}, function (updated_exam) {
                    toastr.success($translate('sitnet_exam_associated_with_course'));
                    $scope.newExam = updated_exam;
                }, function (error) {
                    toastr.error(error.data);
                });

                $scope.newExam.course = $item;
                $scope.courseCodeSearch = $item;
                $scope.courseNameSearch = $item;
            };
        }]);
}());
