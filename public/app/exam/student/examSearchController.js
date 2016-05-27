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
                    enrolmentService.checkAndEnroll(exam);
                };

            }
        ]);
})();
