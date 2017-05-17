(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamFeedbackController', ['$scope', '$translate', 'StudentExamRes', 'examService', 'EXAM_CONF',
            function ($scope, $translate, StudentExamRes, examService, EXAM_CONF) {

                $scope.evaluationPath = EXAM_CONF.TEMPLATES_PATH + "enrolment/exam_feedback.html";
                $scope.filter = {ordering: '-ended'};
                $scope.pageSize = 10;

                $scope.search = function() {
                    StudentExamRes.finishedExams.query({filter: $scope.filter.text},
                        function (participations) {
                            $scope.participations = participations;
                            $scope.participations.filter(function(p) {
                                return p.exam.state === 'GRADED_LOGGED' || p.exam.state === 'REJECTED' || p.exam.state === 'ARCHIVED'
                                    || (p.exam.state === 'GRADED' && p.exam.autoEvaluationNotified);
                            }).forEach(function (p) {
                                loadReview(p);
                            });
                        },
                        function (error) {
                            toastr.error(error.data);
                        });
                };

                $scope.showEvaluations = function (id) {
                    if ($scope.showEval == id) {
                        $scope.showEval = 0;
                    }
                    else {
                        $scope.showEval = id;
                    }
                };

                var loadReview = function (participation) {

                    StudentExamRes.feedback.get({eid: participation.exam.id},
                        function (exam) {
                            if (!exam.grade) {
                                exam.grade = {name: 'NONE'};
                            }
                            if (exam.languageInspection) {
                                exam.grade.displayName = $translate.instant(exam.languageInspection.approved ? 'sitnet_approved' : 'sitnet_rejected');
                                exam.contentGrade = examService.getExamGradeDisplayName(exam.grade.name);
                                exam.gradedTime = exam.languageInspection.finishedAt;

                            } else {
                                exam.grade.displayName = examService.getExamGradeDisplayName(exam.grade.name);
                            }
                            examService.setCredit(exam);
                            participation.reviewedExam = exam;
                        },
                        function (error) {
                            //toastr.error(error.data);
                        }
                    );

                    StudentExamRes.scores.get({eid: participation.exam.id},
                        function (exam) {
                            participation.scores = {
                                maxScore: exam.maxScore,
                                totalScore: exam.totalScore,
                                approvedAnswerCount: exam.approvedAnswerCount,
                                rejectedAnswerCount: exam.rejectedAnswerCount,
                                hasApprovedRejectedAnswers: exam.approvedAnswerCount + exam.rejectedAnswerCount > 0
                            };
                        });

                    };

                $scope.$on('$localeChangeSuccess', function () {
                    $scope.reviewedExam.grade.displayName =
                        examService.getExamGradeDisplayName($scope.reviewedExam.grade.name);
                });


            }]);
}());
