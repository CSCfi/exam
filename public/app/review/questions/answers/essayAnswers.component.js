'use strict';

angular.module('app.review')
    .component('essayAnswers', {
        templateUrl: '/assets/app/review/questions/answers/essayAnswers.template.html',
        controller: ['$routeParams', '$sce', 'QuestionReview', 'Session', 'Attachment',
            function ($routeParams, $sce, QuestionReview, Session, Attachment) {

                var vm = this;

                vm.$onInit = function () {
                    var user = Session.getUser();
                    var ids = $routeParams.q || [];
                    QuestionReview.questionsApi.query({id: $routeParams.id, ids: ids}, function (data) {
                        data.forEach(function (r, i) {
                            r.selected = i === 0;
                        });
                        vm.reviews = data;
                        if (vm.reviews.length > 0) {
                            vm.selectedReview = vm.reviews[0];

                            vm.sanitizeQuestion = function () {
                                return $sce.trustAsHtml(vm.selectedReview.question.question);
                            };

                            vm.getUnassessedAnswerCount = function () {
                                return vm.selectedReview.answers.filter(function (a) {
                                    return !a.essayAnswer || a.essayAnswer.evaluatedScore === null;
                                }).length;
                            };

                            vm.getLockedAnswerCount = function () {
                                return vm.selectedReview.answers.filter(function (a){
                                    var states = ['REVIEW', 'REVIEW_STARTED'];
                                    var isInspector = a.examSection.exam.examInspections.map(function(ei) {
                                        return ei.user.id;
                                    }).indexOf(user.id) > -1;
                                    if (!isInspector) {
                                        states.push('GRADED');
                                    }
                                    return states.indexOf(a.examSection.exam.state) === -1;
                                }).length;
                            }

                        }



                    });
                };

                vm.questionSelected = function (index) {
                    vm.selectedReview = vm.reviews[index];
                };

                vm.isFinalized = function (review) {
                    return QuestionReview.isFinalized(review);
                };

                vm.getAssessedAnswerCount = function () {
                    return QuestionReview.getAssessedAnswerCount(vm.selectedReview);
                };

                vm.downloadQuestionAttachment = function () {
                    Attachment.downloadQuestionAttachment(vm.selectedReview.question);
                };
            }


        ]
    });
