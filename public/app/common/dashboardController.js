(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('DashboardCtrl', ['$scope', 'dashboardService', 'examService', 'questionService',
            'reservationService', 'dateService', 'enrolmentService', 'sessionService',
            function ($scope, dashboardService, examService, questionService, reservationService, dateService,
                      enrolmentService, sessionService) {

                $scope.templates = dashboardService.getTemplates();
                // Pagesize for showing finished exams
                $scope.pageSize = 10;

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.removeReservation = function (enrolment) {
                    reservationService.removeReservation(enrolment);
                };

                $scope.showInstructions = function (enrolment) {
                    enrolmentService.showInstructions(enrolment);
                };

                $scope.showMaturityInstructions = function (enrolment) {
                    enrolmentService.showMaturityInstructions(enrolment);
                };

                $scope.addEnrolmentInformation = function (enrolment) {
                    enrolmentService.addEnrolmentInformation(enrolment);
                };

                //Go to feedback template to show teacher's comments
                $scope.showFeedback = function (id) {
                    examService.showFeedback(id);
                };

                $scope.getUsername = function () {
                    return sessionService.getUserName();
                };

                $scope.createExam = function (executionType) {
                    examService.createExam(executionType);
                };

                $scope.createQuestion = function (type) {
                    questionService.createQuestion(type);
                };

                $scope.removeEnrolment = function (enrolment, enrolments) {
                    enrolmentService.removeEnrolment(enrolment, enrolments);
                };

                $scope.showReservations = function (examId) {
                    reservationService.viewReservations(examId);
                };

                $scope.getExecutionTypeTranslation = function (exam) {
                    return examService.getExecutionTypeTranslation(exam.executionType.type);
                };


                dashboardService.showDashboard().then(function (data) {
                    for (var k in data) {
                        if (data.hasOwnProperty(k)) {
                            $scope[k] = data[k];
                        }
                    }
                }, function (error) {
                    toastr.error(error.data);
                });

            }]);
}());
