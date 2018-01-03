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

'use strict';
angular.module('app.question')
    .component('question', {
        template:
        '<div id="dashboard">\n' +
        '    <div class="top-row">\n' +
        '        <div class="col-md-12">\n' +
        '            <div class="student-details-title-wrap">\n' +
        '                <div class="student-enroll-title-wrap">\n' +
        '                    <div ng-if="!$ctrl.newQuestion" class="student-enroll-title">{{\'sitnet_questions_edit\' | translate}}</div>\n' +
        '                    <div ng-if="$ctrl.newQuestion" class="student-enroll-title">{{\'sitnet_toolbar_new_question\' | translate}}</div>\n' +
        '                </div>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '    <div class="marl50 marr50">\n' +
        '        <!-- Question body //-->\n' +
        '        <div class="col-md-12 question-border padl40 padr40">\n' +
        '            <form role="form" class="form-horizontal" name="questionForm" novalidate>\n' +
        '                <question-body ng-if="$ctrl.question" question="$ctrl.question" ' +
        '                       current-owners="$ctrl.currentOwners" lottery-on="$ctrl.lotteryOn"></question-body>\n' +
        '            </form>\n' +
        '            <!-- buttons -->\n' +
        '            <div class="mart20">\n' +
        '                <div class="question-cancel">\n' +
        '                    <button ng-disabled="!questionForm.$valid" ng-click="$ctrl.saveQuestion()"\n' +
        '                            type="submit" class="btn btn-success bigbutton">{{\'sitnet_save\' | translate}}\n' +
        '                    </button>\n' +
        '                </div>\n' +
        '                <div class="question-cancel marr20">\n' +
        '                    <button ng-click="$ctrl.cancel()" type="submit" class="btn btn-cancel pull-right bigbutton">\n' +
        '                        {{\'sitnet_button_cancel\' | translate}}\n' +
        '                    </button>\n' +
        '                </div>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '</div>\n',
        bindings: {
            newQuestion: '<',
            questionId: '<',
            lotteryOn: '<',
            onSave: '&?',
            onCancel: '&?'
        },
        controller: ['$routeParams', '$scope', '$location', '$translate', 'dialogs', 'Question', 'toast',
            function ($routeParams, $scope, $location, $translate, dialogs, Question, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.currentOwners = [];
                    if (vm.newQuestion) {
                        vm.question = Question.getQuestionDraft();
                        vm.currentOwners = angular.copy(vm.question.questionOwners);
                    } else {
                        Question.questionsApi.get({id: vm.questionId || $routeParams.id},
                            function (question) {
                                vm.question = question;
                                vm.currentOwners = angular.copy(vm.question.questionOwners);
                                window.onbeforeunload = function () {
                                    return $translate.instant('sitnet_unsaved_data_may_be_lost');
                                };
                            },
                            function (error) {
                                toast.error(error.data);
                            }
                        );
                    }
                };

                vm.saveQuestion = function () {
                    vm.question.questionOwners = vm.currentOwners;
                    if (vm.newQuestion) {
                        Question.createQuestion(vm.question).then(
                            function (question) {
                                clearListeners();
                                if (vm.onSave) {
                                    vm.onSave({question: question});
                                } else {
                                    $location.path('/questions');
                                }
                            }, function (error) {
                                toast.error(error.data);
                            });
                    } else {
                        Question.updateQuestion(vm.question, true).then(
                            function () {
                                clearListeners();
                                if (vm.onSave) {
                                    vm.onSave({question: vm.question})
                                } else {
                                    $location.path('/questions');
                                }
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

                var routingWatcher = $scope.$on('$locationChangeStart', function (event, newUrl) {
                    if (window.onbeforeunload) {
                        event.preventDefault();
                        // we got changes in the model, ask confirmation
                        var dialog = dialogs.confirm($translate.instant('sitnet_confirm_exit'),
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

                var clearListeners = function () {
                    window.onbeforeunload = null;
                    // Call off the event listener so it won't ask confirmation now that we are going away
                    routingWatcher();
                };

            }]
    });

