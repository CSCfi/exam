'use strict';

angular.module('app.review')
    .component('questionAssessment', {
        templateUrl: '/assets/app/review/questions/assessment/questionAssessment.template.html',
        controller: ['$routeParams', '$sce', '$translate', 'QuestionReview', 'Assessment', 'Session', 'Attachment',
            function ($routeParams, $sce, $translate, QuestionReview, Assessment, Session, Attachment) {

                var vm = this;

                var isLocked = function (answer) {
                    var states = ['REVIEW', 'REVIEW_STARTED'];
                    var exam = answer.examSection.exam;
                    var isInspector = exam.examInspections.map(function(ei) {
                        return ei.user.id;
                    }).indexOf(vm.user.id) > -1;
                    if (!isInspector) {
                        states.push('GRADED');
                    }
                    return states.indexOf(exam.state) === -1;
                };

                var setSelectedReview = function (review) {
                    vm.selectedReview = review;
                    vm.assessedAnswers = vm.selectedReview.answers.filter(function (a) {
                        return a.essayAnswer && parseFloat(a.essayAnswer.evaluatedScore) >= 0 && !isLocked(a);
                    });
                    vm.unassessedAnswers = vm.selectedReview.answers.filter(function (a) {
                        return !a.essayAnswer || a.essayAnswer.evaluatedScore === null && !isLocked(a);
                    });
                    vm.lockedAnswers = vm.selectedReview.answers.filter(function (a){
                        return isLocked(a);
                    });
                };

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    vm.examId = $routeParams.id;
                    var ids = $routeParams.q || [];
                    QuestionReview.questionsApi.query({id: vm.examId, ids: ids}, function (data) {
                        data.forEach(function (r, i) {
                            r.selected = i === 0; // select the first in the list
                        });
                        vm.reviews = data;
                        if (vm.reviews.length > 0) {
                            setSelectedReview(vm.reviews[0]);

                            vm.sanitizeQuestion = function () {
                                return $sce.trustAsHtml(vm.selectedReview.question.question);
                            };

                            vm.getAssessedAnswerCount = function () {
                                return vm.assessedAnswers.length;;
                            };

                            vm.getUnassessedAnswerCount = function () {
                                return vm.unassessedAnswers.length;
                            };

                            vm.getLockedAnswerCount = function () {
                                return vm.lockedAnswers.length;
                            }

                        }
                    });
                };

                vm.questionSelected = function (index) {
                    setSelectedReview(vm.reviews[index]);
                };

                var saveEvaluation = function (answer) {
                    answer.essayAnswer.evaluatedScore = answer.essayAnswer.score;
                    Assessment.saveEssayScore(answer).then(function () {
                        toastr.info($translate.instant('sitnet_graded'));
                        if (vm.assessedAnswers.indexOf(answer) === -1) {
                            vm.unassessedAnswers.splice(vm.unassessedAnswers.indexOf(answer), 1);
                            vm.assessedAnswers.push(answer);
                        }
                    }, function (err) {
                        // Roll back
                        answer.essayAnswer.evaluatedScore = answer.essayAnswer.score;
                        toastr.error(err.data);
                    });
                };

                vm.saveAssessments = function (answers) {
                    answers.forEach(function (a) {
                        saveEvaluation(a);
                    });
                };

                vm.isFinalized = function (review) {
                    return QuestionReview.isFinalized(review);
                };

                vm.downloadQuestionAttachment = function () {
                    Attachment.downloadQuestionAttachment(vm.selectedReview.question);
                };
            }


        ]
    });
