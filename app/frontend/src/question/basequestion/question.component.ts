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
import { StateParams } from '@uirouter/core';
import * as angular from 'angular';
import * as toast from 'toastr';

import { Question } from '../../exam/exam.model';
import { WindowRef } from '../../utility/window/window.service';
import { QuestionService } from '../question.service';

const QuestionController = (
    $stateParams: StateParams,
    $scope: angular.IScope,
    $location: angular.ILocationService,
    $translate: angular.translate.ITranslateService,
    windowRef: WindowRef,
    dialogs: angular.dialogservice.IDialogService,
    questionService: QuestionService,
) => {
    const routingWatcher = $scope.$on('$locationChangeStart', (event, newUrl) => {
        if (windowRef.nativeWindow.onbeforeunload) {
            event.preventDefault();
            // we got changes in the model, ask confirmation
            const dialog = dialogs.confirm(
                $translate.instant('sitnet_confirm_exit'),
                $translate.instant('sitnet_unsaved_question_data'),
            );
            dialog.result.then(data => {
                if (data.toString() === 'yes') {
                    // ok to reroute
                    windowRef.nativeWindow.onbeforeunload = null;
                    routingWatcher();
                    $location.path(newUrl.substring($location.absUrl().length - $location.url().length));
                }
            });
        } else {
            windowRef.nativeWindow.onbeforeunload = null;
            routingWatcher();
        }
    });

    const clearListeners = () => {
        windowRef.nativeWindow.onbeforeunload = null;
        // Call off the event listener so it won't ask confirmation now that we are going away
        routingWatcher();
    };

    this.$onInit = () => {
        this.currentOwners = [];
        if (this.newQuestion) {
            this.question = questionService.getQuestionDraft();
            delete this.question.id; // TODO: TS/JS hack
            this.currentOwners = angular.copy(this.question.questionOwners);
        } else if (this.questionDraft && this.collaborative) {
            this.question = this.questionDraft;
            this.currentOwners = angular.copy(this.question.questionOwners);
            windowRef.nativeWindow.onbeforeunload = () => $translate.instant('sitnet_unsaved_data_may_be_lost');
        } else {
            questionService.getQuestion(this.questionId || $stateParams.id).subscribe(
                (question: Question) => {
                    this.question = question;
                    this.currentOwners = angular.copy(this.question.questionOwners);
                    windowRef.nativeWindow.onbeforeunload = () => $translate.instant('sitnet_unsaved_data_may_be_lost');
                },
                error => toast.error(error.data),
            );
        }
    };

    this.hasNoCorrectOption = () =>
        this.question.type === 'MultipleChoiceQuestion' && this.question.options.every(o => !o.correctOption);

    this.saveQuestion = () => {
        this.question.questionOwners = this.currentOwners;
        const fn = q => {
            clearListeners();
            if (this.onSave) {
                this.onSave({ question: q });
            } else {
                $location.path('/questions');
            }
        };

        if (this.collaborative) {
            fn(this.question);
        } else if (this.newQuestion) {
            questionService.createQuestion(this.question).then(fn, error => toast.error(error.data));
        } else {
            questionService
                .updateQuestion(this.question)
                .then(() => fn(this.question), error => toast.error(error.data));
        }
    };

    this.cancel = () => {
        toast.info($translate.instant('sitnet_canceled'));
        // Call off the event listener so it won't ask confirmation now that we are going away
        clearListeners();
        if (this.onCancel) {
            this.onCancel();
        } else {
            $location.path('/questions');
        }
    };
};

angular.module('app.question').component('question', {
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
                                <button ng-disabled=
                                    "!questionForm.$valid || !$ctrl.question.type || $ctrl.hasNoCorrectOption()"
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
        onCancel: '&?',
    },
    controller: [
        '$stateParams',
        '$scope',
        '$location',
        '$translate',
        '$window',
        'dialogs',
        'Question',
        QuestionController,
    ],
});
