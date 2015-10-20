(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('EnrollController', ['$scope', '$translate', 'EnrollRes', 'examService', 'dateService',
            '$routeParams', 'EXAM_CONF', '$location', 'enrolmentService', 'SettingsResource',
            function ($scope, $translate, EnrollRes, examService, dateService, $routeParams, EXAM_CONF, $location,
                      enrolmentService, SettingsResource) {

                $scope.enrollPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/enroll.html";
                $scope.examPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/exam.html";
                $scope.detailedInfoPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/detailed_info.html";

                var getMaturityInstructions = function(exam) {
                    if (exam.examLanguages.length != 1) {
                        console.warn("Exam has no exam languages or it has several!");
                    }
                    var lang = exam.examLanguages.length > 0 ? exam.examLanguages[0].code : 'fi';
                    SettingsResource.maturityInstructions.get({lang: lang}, function(data) {
                       exam.maturityInstructions = data.value;
                    });
                };

                if ($routeParams.code && $routeParams.id) {

                    EnrollRes.enroll.get({code: $routeParams.code, id: $routeParams.id},
                        function (exam) {
                            exam.languages = exam.examLanguages.map(function (lang) {
                                return getLanguageNativeName(lang.code);
                            });
                            examService.setExamOwners(exam);
                            $scope.exam = exam;
                            getMaturityInstructions($scope.exam);
                            EnrollRes.check.get({id: exam.id}, function () {
                                $scope.exam.notEnrolled = false;
                            }, function () {
                                $scope.exam.notEnrolled = true;
                            });
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
                                examService.setExamOwners(exam);

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

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.enrollExam = function (exam) {
                    EnrollRes.check.get({id: exam.id}, function () {
                            // already enrolled
                            toastr.error($translate.instant('sitnet_already_enrolled'));
                        }, function () {
                            enrolmentService.enroll(exam);
                        }
                    )
                };

                $scope.enrollList = function () {
                    $location.path('enroll/' + $routeParams.code);
                };

            }]);
}());
