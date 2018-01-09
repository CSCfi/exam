/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

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
