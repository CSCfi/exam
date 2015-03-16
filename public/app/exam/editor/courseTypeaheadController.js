(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('CourseTypeaheadCtrl', ['$http', '$scope', 'limitToFilter', 'CourseRes', 'ExamRes', 'examService', '$translate',
            function ($http, $scope, limitToFilter, CourseRes, ExamRes, examService, $translate) {

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

            $scope.displayGradeScale = function (description) {
                return examService.getScaleDisplayName(description);
            };

            $scope.onCourseSelect = function ($item, $model, $label, exam) {

//                console.log($item);
//                console.log($model);
//                console.log($label);
//                console.log(exam);

                // save new course if not exits, interface set id to 0
                if($item.id === 0) {
                    ExamRes.courses.insert({code: $item.code}, function (inserted_course) {

                        $item = inserted_course;
                        toastr.success($translate('sitnet_course_added'));

                        ExamRes.course.update({eid: exam.id, cid: $item.id}, function (updated_exam) {
                            toastr.success($translate('sitnet_exam_associated_with_course'));
                            $scope.newExam = updated_exam;
                        }, function (error) {
                            if(error.data.indexOf("sitnet_course_not_found") >= 0) {
                                toastr.error($translate('sitnet_course_not_found'));
                            } else {
                                toastr.error(error.data);
                            }
                        });

                    }, function (error) {
                        toastr.error(error.data);
                    });
                } else {

                    ExamRes.course.update({eid: exam.id, cid: $item.id}, function (updated_exam) {
                        toastr.success($translate('sitnet_exam_associated_with_course'));
                        $scope.newExam = updated_exam;
                    }, function (error) {
                        toastr.error(error.data);
                    });
                }

                $scope.newExam.course = $item;
                $scope.courseCodeSearch = $item;
                $scope.courseNameSearch = $item;
            };
        }]);
}());
