'use strict';
angular.module('app.enrolment')
    .component('examParticipation', {
        templateUrl: '/assets/app/enrolment/finished/examParticipation.template.html',
        bindings: {
            participation: '<'
        },
        controller: ['$scope', '$translate', 'StudentExamRes', 'Exam',
            function ($scope, $translate, StudentExamRes, Exam) {

                var vm = this;

                vm.$onInit = function () {
                    var state = vm.participation.exam.state;
                    if (state === 'GRADED_LOGGED' || state === 'REJECTED' || state === 'ARCHIVED'
                        || (state === 'GRADED' && vm.participation.exam.autoEvaluationNotified)) {
                        loadReview();
                    }
                };

                var loadReview = function () {
                    StudentExamRes.feedback.get({eid: vm.participation.exam.id},
                        function (exam) {
                            if (!exam.grade) {
                                exam.grade = {name: 'NONE'};
                            }
                            if (exam.languageInspection) {
                                exam.grade.displayName = $translate.instant(
                                    exam.languageInspection.approved ? 'sitnet_approved' : 'sitnet_rejected');
                                exam.contentGrade = Exam.getExamGradeDisplayName(exam.grade.name);
                                exam.gradedTime = exam.languageInspection.finishedAt;
                            } else {
                                exam.grade.displayName = Exam.getExamGradeDisplayName(exam.grade.name);
                            }
                            Exam.setCredit(exam);
                            if (exam.creditType) {
                                exam.creditType.displayName = Exam.getExamTypeDisplayName(exam.creditType.type);
                            }
                            vm.participation.reviewedExam = exam;
                            StudentExamRes.scores.get({eid: vm.participation.exam.id},
                                function (data) {
                                    vm.participation.scores = {
                                        maxScore: data.maxScore,
                                        totalScore: data.totalScore,
                                        approvedAnswerCount: data.approvedAnswerCount,
                                        rejectedAnswerCount: data.rejectedAnswerCount,
                                        hasApprovedRejectedAnswers: data.approvedAnswerCount + data.rejectedAnswerCount > 0
                                    };
                                });
                        }
                    );
                };

                $scope.$on('$localeChangeSuccess', function () {
                    if (vm.participation.reviewedExam) {
                        vm.participation.reviewedExam.grade.displayName =
                            Exam.getExamGradeDisplayName(vm.participation.reviewedExam.grade.name);
                    }
                });

            }
        ]
    });




