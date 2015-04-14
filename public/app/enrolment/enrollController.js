(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('EnrollController', ['$scope', 'EnrollRes', 'examService', 'enrolmentService', 'dateService', '$routeParams', 'SITNET_CONF', '$location', '$translate',
            function ($scope, EnrollRes, examService, enrolmentService, dateService, $routeParams, SITNET_CONF, $location, $translate) {

                $scope.enrollPath = SITNET_CONF.TEMPLATES_PATH + "enrolment/enroll.html";
                $scope.examPath = SITNET_CONF.TEMPLATES_PATH + "enrolment/exam.html";
                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "enrolment/review_exam_section_general.html";

                if ($routeParams.code === undefined) {
                    console.log($routeParams.code);

                }
                else if ($routeParams.code && $routeParams.id) {

                    EnrollRes.enroll.get({code: $routeParams.code, id: $routeParams.id},
                        function (exam) {
                            exam.languages = exam.examLanguages.map(function (lang) {
                                return getLanguageNativeName(lang.code);
                            });
                            $scope.exam = exam;
                            examService.setExamTeachers(exam);
                        },
                        function (error) {
                            toastr.error(error.data);
                        });
                }
                else if ($routeParams.code) {
                    EnrollRes.list.get({code: $routeParams.code},
                        function (exams) {
                            $scope.exams = exams.map(function (exam) {
                                exam.languages = exam.examLanguages.map(function (lang) {
                                    return getLanguageNativeName(lang.code);
                                });
                                examService.setExamTeachers(exam);
                                return exam;
                            });
                        },
                        function (error) {
                            toastr.error(error.data);
                        });
                }

                $scope.translateExamType = function (type) {
                    return examService.getExamTypeDisplayName(type);
                };

                $scope.translateGradeScale = function (scale) {
                    return examService.getScaleDisplayName(scale);
                };

                $scope.printExamDuration = function(exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.enrollExam = function (exam) {
                    enrolmentService.enroll(exam);
                };

                $scope.enrollList = function () {
                    $location.path('enroll/' + $routeParams.code);
                }

            }]);
}());