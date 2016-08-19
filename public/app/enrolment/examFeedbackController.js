(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamFeedbackController', ['$scope', 'sessionService', '$routeParams', '$location', 'EXAM_CONF', 'StudentExamRes', 'examService',
            function ($scope, sessionService, $routeParams, $location, EXAM_CONF, StudentExamRes, examService) {

                $scope.feedbackTemplate = EXAM_CONF.TEMPLATES_PATH + "enrolment/exam_feedback.html";

                StudentExamRes.feedback.get({eid: $routeParams.id},
                    function (exam) {
                        if (!exam.grade) {
                            exam.grade = {name: 'NONE'};
                        }
                        exam.grade.displayName = examService.getExamGradeDisplayName(exam.grade.name);
                        examService.setCredit(exam);
                        $scope.reviewedExam = exam;
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                StudentExamRes.scores.get({eid: $routeParams.id},
                    function (exam) {
                        $scope.scores = {
                            maxScore: exam.maxScore,
                            totalScore: exam.totalScore,
                            approvedAnswerCount: exam.approvedAnswerCount,
                            rejectedAnswerCount: exam.rejectedAnswerCount,
                            hasApprovedRejectedAnswers: exam.approvedAnswerCount + exam.rejectedAnswerCount > 0
                        };
                    });

                //Go to feedback template to show teacher's comments
                $scope.exitFeedback = function () {
                    $location.path("/");
                };

                $scope.$on('$localeChangeSuccess', function () {
                    $scope.reviewedExam.grade.displayName =
                        examService.getExamGradeDisplayName($scope.reviewedExam.grade.name);
                });


            }]);
}());
