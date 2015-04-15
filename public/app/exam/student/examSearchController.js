(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamSearchCtrl', ['$scope', '$timeout', 'StudentExamRes', 'examService', 'enrolmentService', 'SITNET_CONF',
            function ($scope, $timeout, StudentExamRes, examService, enrolmentService, SITNET_CONF) {

                $scope.examPath = SITNET_CONF.TEMPLATES_PATH + "enrolment/exam.html";
                var searching;

                var doSearch = function () {
                    StudentExamRes.exams.query({filter: $scope.filter}, function (exams) {
                        exams.forEach(function (exam) {
                            exam.languages = exam.examLanguages.map(function (lang) {
                                return getLanguageNativeName(lang.code);
                            });
                            examService.setExamOwnersAndInspectors(exam);
                        });
                        $scope.exams = exams;
                        searching = false;
                    });
                };

                $scope.search = function () {
                    // add a bit of delay so we don't hit the server that often
                    if (!searching) {
                        $timeout(doSearch, 200);
                        searching = true;
                    }
                };

                $scope.enrollExam = function (exam) {
                    enrolmentService.enroll(exam);
                }

            }]);
})();