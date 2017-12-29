'use strict';

angular.module('app.review')
    .component('assessment', {
        templateUrl: '/assets/app/review/assessment/assessment.template.html',
        controller: ['$routeParams', 'Assessment', 'ExamRes', 'Question', 'Session', 'Exam', 'toast',
            function ($routeParams, Assessment, ExamRes, Question, Session, Exam, toast) {

                var vm = this;

                vm.$onInit = function () {
                    ExamRes.reviewerExam.get({eid: $routeParams.id},
                        function (exam) {
                            exam.examSections.forEach(function (es) {
                                es.sectionQuestions.filter(function (esq) {
                                    return esq.question.type === 'ClozeTestQuestion' && esq.clozeTestAnswer.answer;
                                }).forEach(function (esq) {
                                    esq.clozeTestAnswer.answer = JSON.parse(esq.clozeTestAnswer.answer);
                                });
                            });

                            vm.questionSummary = Question.getQuestionAmounts(exam);
                            vm.exam = exam;
                            vm.user = Session.getUser();
                            vm.backUrl = vm.user.isAdmin ? "/" : "/exams/" + vm.exam.parent.id + "/4";
                        }, function (err) {
                            toast.error(err.data);
                        });
                };

                vm.isUnderLanguageInspection = function () {
                    if (!vm.user) return false;
                    return vm.user.isLanguageInspector &&
                        vm.exam.languageInspection &&
                        !vm.exam.languageInspection.finishedAt;
                };

                vm.print = function () {
                    window.open("/print/exam/" + vm.exam.id, "_blank");
                };

                vm.scoreSet = function () {
                    angular.extend(vm.questionSummary, Question.getQuestionAmounts(vm.exam));
                    startReview();
                };

                vm.gradingUpdated = function () {
                    startReview();
                };

                vm.isOwnerOrAdmin = function () {
                    return Exam.isOwnerOrAdmin(vm.exam);
                };

                vm.isReadOnly = function () {
                    return Assessment.isReadOnly(vm.exam);
                };

                vm.isGraded = function () {
                    return Assessment.isGraded(vm.exam);
                };

                // Set review status as started if not already done so
                var startReview = function () {
                    if (vm.exam.state === 'REVIEW') {
                        var review = Assessment.getPayload(vm.exam, 'REVIEW_STARTED');
                        ExamRes.review.update({id: review.id}, review);
                    }
                };

            }
        ]
    });
