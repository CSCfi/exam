(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('CourseTypeaheadCtrl', ['$http', '$scope', 'limitToFilter', 'CourseRes', 'ExamRes', 'examService', '$translate',
            function ($http, $scope, limitToFilter, CourseRes, ExamRes, examService, $translate) {

            $scope.getCourses = function(filter, criteria) {
                $scope.loadingCoursesByCode = true;
                return CourseRes.courses.query({filter: filter, q: criteria}).$promise.then(
                    function (courses) {
                        $scope.loadingCoursesByCode = false;
                        return limitToFilter(courses, 15);
                    },
                    function (error) {
                        $scope.loadingCoursesByCode = false;
                        toastr.error($translate('sitnet_course_not_found'));
                        return "";
                    }
                );
            };
            $scope.displayGradeScale = function (description) {
                if (!description) {
                    return "";
                }
                return examService.getScaleDisplayName(description);
            };

            $scope.onCourseSelect = function ($item, $model, $label, exam) {
                // save new course if not exits, interface set id to 0
                if($item.id === 0) {
                    ExamRes.courses.insert({code: $item.code}, function (inserted_course) {

                        $item = inserted_course;
                        toastr.success($translate('sitnet_course_added'));

                        ExamRes.course.update({eid: exam.id, cid: $item.id}, function (updated_exam) {
                            toastr.success($translate('sitnet_exam_associated_with_course'));
                            $scope.newExam = updated_exam;
                        }, function (error) {
                            toastr.error($translate('sitnet_course_not_found'));
                        });

                    }, function (error) {
                        toastr.error($translate('sitnet_course_not_found'));
                    });
                } else {

                    ExamRes.course.update({eid: exam.id, cid: $item.id}, function (updated_exam) {
                        toastr.success($translate('sitnet_exam_associated_with_course'));
                        $scope.newExam = updated_exam;
                    }, function (error) {
                        toastr.error($translate('sitnet_course_not_found'));
                    });
                }

                $scope.newExam.course = $item;
                $scope.courseCodeSearch = $item;
                $scope.courseNameSearch = $item;
            };
        }]);
}());
