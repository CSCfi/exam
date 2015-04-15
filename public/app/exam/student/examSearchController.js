(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamSearchCtrl', ['$scope', 'StudentExamRes', 'examService', 'enrolmentService', 'SITNET_CONF',
            function ($scope, StudentExamRes, examService, enrolmentService, SITNET_CONF) {

                $scope.examPath = SITNET_CONF.TEMPLATES_PATH + "enrolment/exam.html";

                $scope.search = function () {
                    StudentExamRes.exams.query({filter: $scope.filter}, function (exams) {
                        exams.forEach(function (exam) {
                            exam.languages = exam.examLanguages.map(function (lang) {
                                return getLanguageNativeName(lang.code);
                            });
                            examService.setExamTeachers(exam);
                        });
                        $scope.exams = exams;
                    });
                };

                $scope.enrollExam = function (exam) {
                    enrolmentService.enroll(exam);
                }

            }]);
})();