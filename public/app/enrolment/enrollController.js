(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('EnrollController', ['$scope', '$routeParams', 'examService', 'enrolmentService', 'dateService',
            'EXAM_CONF',
            function ($scope, $routeParams, examService, enrolmentService, dateService, EXAM_CONF) {

                $scope.enrollPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/enroll.html";
                $scope.examPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/exam.html";
                $scope.detailedInfoPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/detailed_info.html";

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
                    enrolmentService.checkAndEnroll(exam);
                };

                $scope.enrollList = function () {
                    enrolmentService.gotoList($routeParams.code);
                };

                enrolmentService.listEnrolments($scope, $routeParams.code, $routeParams.id);


            }]);
}());
