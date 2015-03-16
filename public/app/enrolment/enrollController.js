(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('EnrollController', ['$scope', 'EnrollRes', 'examService', 'dateService', '$routeParams', 'SITNET_CONF', '$location',
            function ($scope, EnrollRes, examService, dateService, $routeParams, SITNET_CONF, $location) {

                $scope.enrollPath = SITNET_CONF.TEMPLATES_PATH + "enrolment/enroll.html";
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
                    EnrollRes.enroll.create({code: exam.course.code, id: exam.id},
                        function (exam) {

                            toastr.success("Olet ilmoittautunut tenttiin<br>Muista varata tenttikone");
                            $location.path('/calendar/' + exam.id);
                        },
                        function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.enrollList = function () {
                    $location.path('enroll/' + $routeParams.code);
                }

            }]);
}());