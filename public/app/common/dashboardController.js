(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('DashboardCtrl', ['$scope', '$location', 'dashboardService', 'examService', 'questionService',
            'reservationService', 'dateService', 'enrolmentService', 'sessionService','EXAM_CONF',
            function ($scope, $location, dashboardService, examService, questionService, reservationService, dateService,
                      enrolmentService, sessionService, EXAM_CONF) {

                $scope.evaluationPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/exam_feedback.html";

                $scope.filter = {ordering: '-ended'};
                $scope.templates = dashboardService.getTemplates();
                // Pagesize for showing finished exams
                $scope.pageSize = 10;
                $scope.showInst = 0;
                $scope.showEval = 0;

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.removeReservation = function (enrolment) {
                    reservationService.removeReservation(enrolment);
                };

                $scope.showInstructions = function (id) {

                    if($scope.showInst == id) {
                        $scope.showInst = 0;
                    }
                    else {
                        $scope.showInst = id;
                    }
                };

                $scope.showEvaluations = function (id) {

                    if($scope.showEval == id) {
                        $scope.showEval = 0;
                    }
                    else {
                        $scope.showEval = id;
                    }
                };

                $scope.showMaturityInstructions = function (enrolment) {
                    enrolmentService.showMaturityInstructions(enrolment);
                };

                $scope.addEnrolmentInformation = function (enrolment) {
                    console.log('clicked');
                    enrolmentService.addEnrolmentInformation(enrolment);
                };

                //Go to feedback template to show teacher's comments
                $scope.showFeedback = function (id) {
                    examService.showFeedback(id);
                };

                $scope.searchParticipations = function () {
                    return dashboardService.searchParticipations($scope.filter.text).then(function (data) {
                        $scope.participations = data.participations;
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.getUsername = function () {
                    return sessionService.getUserName();
                };

                $scope.createExam = function (executionType) {
                    examService.createExam(executionType);
                };

                $scope.createQuestion = function (type) {
                    $location.path("/questions/new/" + type);
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
