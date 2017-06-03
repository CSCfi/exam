(function () {
    'use strict';
    angular.module('app.enrolment')
        .controller('EnrollController', ['$scope', '$routeParams', 'examService', 'enrolmentService', 'dateService',
            'EXAM_CONF', '$location',
            function ($scope, $routeParams, examService, enrolmentService, dateService, EXAM_CONF, $location) {

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

                $scope.makeReservation = function (exam) {
                    $location.path("/calendar/" + exam.id);
                };

            }]);
}());
