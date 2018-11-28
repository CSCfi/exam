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

import * as angular from 'angular';
import * as toast from 'toastr';
import { QuestionService } from '../question.service';
import { Question } from '../../exam/exam.model';

angular.module('app.question')
    .component('question', {
        template: `
            <div id="dashboard">
                <div class="top-row">
                    <div class="col-md-12">
                        <div class="student-details-title-wrap">
                            <div class="student-enroll-title-wrap">
                                <div ng-if="!$ctrl.newQuestion" class="student-enroll-title">
                                    {{'sitnet_questions_edit' | translate}}
                                </div>
                                <div ng-if="$ctrl.newQuestion" class="student-enroll-title">
                                    {{'sitnet_toolbar_new_question' | translate}}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="marl50 marr50">
                    <!-- Question body //-->
                    <div class="col-md-12 question-border padl40 padr40">
                        <form role="form" class="form-horizontal" name="questionForm" novalidate>
                            <question-body ng-if="$ctrl.question" question="$ctrl.question"
                                   current-owners="$ctrl.currentOwners" lottery-on="$ctrl.lotteryOn"
                                   exam-id="$ctrl.examId" section-question="$ctrl.sectionQuestion"></question-body>
                        </form>
                        <!-- buttons -->
                        <div class="mart20">
                            <div class="question-cancel">
                                <button ng-disabled="!questionForm.$valid || !$ctrl.question.type"
                                    ng-click="$ctrl.saveQuestion()"
                                    type="submit" class="btn btn-success bigbutton">{{'sitnet_save' | translate}}
                                </button>
                            </div>
                            <div class="question-cancel marr20">
                                <button ng-click="$ctrl.cancel()" type="submit"
                                    class="btn btn-cancel pull-right bigbutton">
                                    {{'sitnet_button_cancel' | translate}}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`,
        bindings: {
            newQuestion: '<',
            questionId: '<',
            questionDraft: '<?',
            lotteryOn: '<',
            collaborative: '<',
            examId: '<',
            sectionQuestion: '<',
            onSave: '&?',
            onCancel: '&?'
        },
        controller: ['$routeParams', '$scope', '$location', '$translate', 'dialogs', 'Question',
            function ($routeParams, $scope, $location, $translate, dialogs, Question: QuestionService) {

                const vm = this;

                vm.$onInit = function () {
                    vm.currentOwners = [];
                    if (vm.newQuestion) {
                        vm.question = Question.getQuestionDraft();
                        vm.currentOwners = angular.copy(vm.question.questionOwners);
                    } else if (vm.questionDraft && vm.collaborative) {
                        vm.question = vm.questionDraft;
                        vm.currentOwners = angular.copy(vm.question.questionOwners);
                        window.onbeforeunload = function () {
                            return $translate.instant('sitnet_unsaved_data_may_be_lost');
                        };
                    } else {
                        Question.getQuestion(vm.questionId || $routeParams.id).subscribe(
                            (question: Question) => {
                                vm.question = question;
                                vm.currentOwners = angular.copy(vm.question.questionOwners);
                                window.onbeforeunload = function () {
                                    return $translate.instant('sitnet_unsaved_data_may_be_lost');
                                };
                            }, (error) => toast.error(error.data)
                        );
                    }
                };

                vm.saveQuestion = function () {
                    vm.question.questionOwners = vm.currentOwners;
                    const fn = function (q) {
                        clearListeners();
                        if (vm.onSave) {
                            vm.onSave({ question: q });
                        } else {
                            $location.path('/questions');
                        }
                    };

                    if (vm.collaborative) {
                        fn(vm.question);
                    } else if (vm.newQuestion) {
                        Question.createQuestion(vm.question).then(
                            function (question) {
                                fn(question);
                            }, function (error) {
                                toast.error(error.data);
                            });
                    } else {
                        Question.updateQuestion(vm.question, true).then(
                            function () {
                                fn(vm.question);
                            }, function (error) {
                                toast.error(error.data);
                            });
                    }
                };

                vm.cancel = function () {
                    toast.info($translate.instant('sitnet_canceled'));
                    // Call off the event listener so it won't ask confirmation now that we are going away
                    clearListeners();
                    if (vm.onCancel) {
                        vm.onCancel();
                    } else {
                        $location.path('/questions');
                    }
                };

                const routingWatcher = $scope.$on('$locationChangeStart', function (event, newUrl) {
                    if (window.onbeforeunload) {
                        event.preventDefault();
                        // we got changes in the model, ask confirmation
                        const dialog = dialogs.confirm($translate.instant('sitnet_confirm_exit'),
                            $translate.instant('sitnet_unsaved_question_data'));
                        dialog.result.then(function (data) {
                            if (data.toString() === 'yes') {
                                // ok to reroute
                                clearListeners();
                                $location.path(newUrl.substring($location.absUrl().length - $location.url().length));
                            }
                        });
                    } else {
                        clearListeners();
                    }
                });

                const clearListeners = function () {
                    window.onbeforeunload = null;
                    // Call off the event listener so it won't ask confirmation now that we are going away
                    routingWatcher();
                };

            }]
    });

