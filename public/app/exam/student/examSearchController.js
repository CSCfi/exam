(function () {
    'use strict';
    angular.module('app.exam')
        .controller('ExamSearchCtrl', ['$scope', '$timeout', '$translate', 'StudentExamRes', 'EnrollRes',
                    'SettingsResource', 'examService', 'Enrolment', 'EXAM_CONF', '$location',
            function ($scope, $timeout, $translate, StudentExamRes, EnrollRes, SettingsResource,
                      examService, Enrolment, EXAM_CONF, $location) {

                $scope.filter = {};
                $scope.permissionCheck = {};
                $scope.loader = {
                    loading: false
                };

                $scope.enrolledExams = {};
                $scope.examPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/exam.html";

                var search = function () {
                    StudentExamRes.exams.query({filter: $scope.filter.text}, function (exams) {
                        exams.forEach(function (exam) {

                            if (!exam.examLanguages) {
                                console.warn("No languages for exam #" + exam.id);
                                exam.examLanguages = [];
                            }
                            exam.languages = exam.examLanguages.map(function (lang) {
                                return getLanguageNativeName(lang.code);
                            });

                        });

                        $scope.exams = exams;
                        checkEnrolment();

                        $scope.loader.loading = false;
                    }, function (err) {
                        $scope.loader.loading = false;
                        toastr.error($translate.instant(err.data));
                    });

                };

                if ($scope.permissionCheck.active === undefined) {
                    SettingsResource.enrolmentPermissions.get(function (setting) {
                        $scope.permissionCheck = setting;
                        if (setting.active === true) {
                            $scope.loader.loading = true;
                            search();
                        }
                    });
                }

                $scope.search = function () {
                    if ($scope.permissionCheck.active === false) {
                        if ($scope.filter.text) {
                            $scope.loader.loading = true;
                            search();
                        } else {
                            delete $scope.exams;
                        }
                    }
                };

                $scope.enrollExam = function (exam) {
                    Enrolment.checkAndEnroll(exam);
                };

                var checkEnrolment = function () {

                    $scope.exams.forEach(function (exam) {

                        EnrollRes.check.get({id: exam.id}, function (enrollit) {

                            // check if student has reserved aquarium
                            enrollit.forEach(function (enrolli) {
                                if(enrolli.reservation) {
                                    exam.reservationMade = true;
                                }
                            });

                            // enrolled to exam
                            exam.enrolled = true;

                            }, function (err) {
                                // not enrolled or made reservations
                                exam.enrolled = false;
                                exam.reservationMade = false;
                            }
                        );

                    });

                }

                $scope.makeReservation = function (exam) {
                    $location.path("/calendar/" + exam.id);
                };

            }
        ]);
})();
