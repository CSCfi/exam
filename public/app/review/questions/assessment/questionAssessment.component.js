'use strict';

angular.module('app.review')
    .component('questionAssessment', {
        templateUrl: '/assets/app/review/questions/assessment/questionAssessment.template.html',
        controller: ['$routeParams', '$sce', 'QuestionReview', 'Session', 'Attachment',
            function ($routeParams, $sce, QuestionReview, Session, Attachment) {

                var vm = this;

                var setSelectedReview = function (review) {
                    vm.selectedReview = review;
                    vm.assessedAnswers = vm.selectedReview.answers.filter(function (a) {
                        return a.essayAnswer && parseFloat(a.essayAnswer.evaluatedScore) >= 0;
                    });
                    vm.unassessedAnswers = vm.selectedReview.answers.filter(function (a) {
                        return !a.essayAnswer || a.essayAnswer.evaluatedScore === null;
                    });
                    vm.lockedAnswers = vm.selectedReview.answers.filter(function (a){
                        var states = ['REVIEW', 'REVIEW_STARTED'];
                        var isInspector = a.examSection.exam.examInspections.map(function(ei) {
                            return ei.user.id;
                        }).indexOf(vm.user.id) > -1;
                        if (!isInspector) {
                            states.push('GRADED');
                        }
                        return states.indexOf(a.examSection.exam.state) === -1;
                    });
                };

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    var ids = $routeParams.q || [];
                    QuestionReview.questionsApi.query({id: $routeParams.id, ids: ids}, function (data) {
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

                vm.saveAssessments = function (answers) {
                    // Tallenna bäkkäriin

                    // Siirrä vastaukset arvioitujen listaan
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
