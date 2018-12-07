/*
 * Copyright (c) 2017 Exam Consortium
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

import angular from 'angular';
import toast from 'toastr';

angular.module('app.review')
    .component('questionAssessment', {
        template: require('./questionAssessment.template.html'),
        controller: ['$routeParams', '$q', '$sce', '$translate', 'QuestionReview', 'Assessment', 'Session', 'Attachment',
            function ($routeParams, $q, $sce, $translate, QuestionReview, Assessment, Session, Attachment) {

                const vm = this;

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    vm.examId = $routeParams.id;
                    const ids = $routeParams.q || [];
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
                                return vm.assessedAnswers.length;
                            };

                            vm.getUnassessedAnswerCount = function () {
                                return vm.unassessedAnswers.length;
                            };

                            vm.getLockedAnswerCount = function () {
                                return vm.lockedAnswers.length;
                            };

                        }
                    });
                };

                vm.questionSelected = function (index) {
                    setSelectedReview(vm.reviews[index]);
                };

                vm.saveAssessments = function (answers) {
                    const promises = [];
                    answers.forEach(function (a) {
                        promises.push(saveEvaluation(a));
                    });
                    $q.all(promises).then(function () {
                        vm.reviews = angular.copy(vm.reviews);
                    });
                };

                vm.isFinalized = function (review) {
                    return QuestionReview.isFinalized(review);
                };

                vm.downloadQuestionAttachment = function () {
                    Attachment.downloadQuestionAttachment(vm.selectedReview.question);
                };

                const isLocked = function (answer) {
                    const states = ['REVIEW', 'REVIEW_STARTED'];
                    const exam = answer.examSection.exam;
                    const isInspector = exam.examInspections.map(function (ei) {
                        return ei.user.id;
                    }).indexOf(vm.user.id) > -1;
                    if (!isInspector) {
                        states.push('GRADED');
                    }
                    return states.indexOf(exam.state) === -1;
                };

                const setSelectedReview = function (review) {
                    vm.selectedReview = review;
                    vm.assessedAnswers = vm.selectedReview.answers.filter(function (a) {
                        return a.essayAnswer && parseFloat(a.essayAnswer.evaluatedScore) >= 0 && !isLocked(a);
                    });
                    vm.unassessedAnswers = vm.selectedReview.answers.filter(function (a) {
                        return !a.essayAnswer || a.essayAnswer.evaluatedScore === null && !isLocked(a);
                    });
                    vm.lockedAnswers = vm.selectedReview.answers.filter(function (a) {
                        return isLocked(a);
                    });
                };

                const saveEvaluation = function (answer) {
                    const deferred = $q.defer();
                    answer.essayAnswer.evaluatedScore = answer.essayAnswer.score;
                    Assessment.saveEssayScore(answer).then(function () {
                        toast.info($translate.instant('sitnet_graded'));
                        if (vm.assessedAnswers.indexOf(answer) === -1) {
                            vm.unassessedAnswers.splice(vm.unassessedAnswers.indexOf(answer), 1);
                            vm.assessedAnswers.push(answer);
                        }
                        deferred.resolve();
                    }, function (err) {
                        // Roll back
                        answer.essayAnswer.evaluatedScore = answer.essayAnswer.score;
                        toast.error(err.data);
                        deferred.resolve();
                    });
                    return deferred.promise;
                };
            }


        ]
    });
