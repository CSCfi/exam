(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('CourseTypeaheadCtrl', ['$http', '$scope', 'limitToFilter', 'CourseRes', 'ExamRes', 'examService', '$translate',
            function ($http, $scope, limitToFilter, CourseRes, ExamRes, examService, $translate) {

            $scope.getCourses = function(filter, criteria) {
                toggleLoadingIcon(filter, true);
                var tmp = criteria;
                if ($scope.newExam && $scope.newExam.course && $scope.newExam.course.id) {
                    var course = $scope.newExam.course;
                    $scope.newExam.course = undefined;
                    setInputValue(filter, tmp);

                    ExamRes.course.delete({eid: $scope.newExam.id, cid: course.id}, function (updated_exam) {
                        $scope.newExam = updated_exam;
                        setInputValue(filter, tmp);
                    });
                }
                return CourseRes.courses.query({filter: filter, q: criteria}).$promise.then(
                    function (courses) {
                        toggleLoadingIcon(filter, false);

                        if(!courses || !courses.hasOwnProperty("length") || courses.length === 0) {
                            toastr.error($translate.instant('sitnet_course_not_found') + ' ( ' + tmp + ' )');
                        }
                        return courses;
                    },
                    function () {
                        toggleLoadingIcon(filter, false);
                        $scope.newExam.course = undefined;
                        toastr.error($translate.instant('sitnet_course_not_found') + ' ( ' + tmp + ' )');
                        return [];
                    }
                );
            };

            function toggleLoadingIcon(filter, isOn) {
                if(filter && filter === 'code') {
                    $scope.loadingCoursesByCode = isOn;
                } else if(filter && filter === 'name') {
                    $scope.loadingCoursesByName = isOn;
                }
            }

            function setInputValue(filter, tmp) {
                if(filter && filter === 'code') {
                    $scope.newExam.course = {code: tmp};
                } else if(filter && filter === 'name') {
                    $scope.newExam.course = {name: tmp};
                }
            }

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
                        toastr.success($translate.instant('sitnet_course_added'));

                        ExamRes.course.update({eid: exam.id, cid: $item.id}, function (updated_exam) {
                            toastr.success($translate.instant('sitnet_exam_associated_with_course'));
                            $scope.newExam = updated_exam;
                        }, function (error) {
                            toastr.error($translate.instant('sitnet_course_not_found'));
                        });

                    }, function (error) {
                        toastr.error($translate.instant('sitnet_course_not_found'));
                    });
                } else {

                    ExamRes.course.update({eid: exam.id, cid: $item.id}, function (updated_exam) {
                        toastr.success($translate.instant('sitnet_exam_associated_with_course'));
                        $scope.newExam = updated_exam;
                    }, function (error) {
                        toastr.error($translate.instant('sitnet_course_not_found'));
                    });
                }

                $scope.newExam.course = $item;
                $scope.courseCodeSearch = $item;
                $scope.courseNameSearch = $item;
            };
        }]);
}());
