(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamSearchCtrl', ['$scope', '$timeout', '$translate', 'StudentExamRes', 'EnrollRes', 'SettingsResource', 'examService', 'enrolmentService', 'EXAM_CONF',
            function ($scope, $timeout, $translate, StudentExamRes, EnrollRes, SettingsResource, examService, enrolmentService, EXAM_CONF) {

                $scope.filter = {};
                $scope.permissionCheck = {};
                $scope.loader = {
                    loading: false
                };

                $scope.examPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/exam.html";
                var searching;

                var doSearch = function () {
                    StudentExamRes.exams.query({filter: $scope.filter.text}, function (exams) {
                        exams.forEach(function (exam) {
                            exam.languages = exam.examLanguages.map(function (lang) {
                                return getLanguageNativeName(lang.code);
                            });
                        });
                        $scope.exams = exams;
                        searching = false;
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
                            doSearch();
                        }
                    });
                }

                $scope.search = function () {
                    // add a bit of delay so we don't hit the server that often
                    if (!searching && $scope.permissionCheck.active === false) {
                        $timeout(doSearch, 200);
                        searching = true;
                    }
                };

                $scope.enrollExam = function (exam) {
                    EnrollRes.check.get({id: exam.id}, function () {
                            // already enrolled
                            toastr.error($translate.instant('sitnet_already_enrolled'));
                        }, function () {
                            enrolmentService.enroll(exam);
                        }
                    )
                }

            }
        ])
    ;
})
();
