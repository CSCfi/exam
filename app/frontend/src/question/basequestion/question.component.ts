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
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateParams, StateService, TransitionService } from '@uirouter/core';
import * as angular from 'angular';
import * as toast from 'toastr';

import { ExamSectionQuestion, Question } from '../../exam/exam.model';
import { User } from '../../session/session.service';
import { ConfirmationDialogService } from '../../utility/dialogs/confirmationDialog.service';
import { WindowRef } from '../../utility/window/window.service';
import { QuestionDraft, QuestionService } from '../question.service';

@Component({
    selector: 'question',
    template: require('./question.component.html'),
})
export class QuestionComponent implements OnInit {
    @Input() newQuestion: boolean;
    @Input() questionId: number;
    @Input() questionDraft: Question;
    @Input() lotteryOn: boolean;
    @Input() collaborative: boolean;
    @Input() examId: number;
    @Input() sectionQuestion: ExamSectionQuestion;

    @Output() onSave = new EventEmitter<Question | QuestionDraft>();
    @Output() onCancel = new EventEmitter<void>();

    currentOwners: User[];
    question: Question | QuestionDraft;
    transitionWatcher: Function;

    constructor(
        private stateParams: StateParams,
        private State: StateService,
        private transition: TransitionService,
        private location: Location,
        private translate: TranslateService,
        private window: WindowRef,
        private dialogs: ConfirmationDialogService,
        private Question: QuestionService,
    ) {
        this.transitionWatcher = this.transition.onStart({ to: '*' }, t => {
            if (this.window.nativeWindow.onbeforeunload) {
                t.abort();
                // we got changes in the model, ask confirmation
                const dialog = dialogs.open(
                    this.translate.instant('sitnet_confirm_exit'),
                    this.translate.instant('sitnet_unsaved_question_data'),
                );
                dialog.result.then(data => {
                    if (data.toString() === 'yes') {
                        // ok to reroute
                        this.window.nativeWindow.onbeforeunload = null;
                        delete this.transitionWatcher;
                        this.State.go(t.to());
                    }
                });
            } else {
                this.window.nativeWindow.onbeforeunload = null;
                delete this.transitionWatcher;
                this.State.go(t.to());
            }
        });
    }

    ngOnInit() {
        this.currentOwners = [];
        if (this.newQuestion) {
            this.question = this.Question.getQuestionDraft();
            this.currentOwners = angular.copy(this.question.questionOwners);
        } else if (this.questionDraft && this.collaborative) {
            this.question = this.questionDraft;
            this.currentOwners = angular.copy(this.question.questionOwners);
            this.window.nativeWindow.onbeforeunload = () => this.translate.instant('sitnet_unsaved_data_may_be_lost');
        } else {
            this.Question.getQuestion(this.questionId || this.stateParams.id).subscribe(
                (question: Question) => {
                    this.question = question;
                    this.currentOwners = angular.copy(this.question.questionOwners);
                    this.window.nativeWindow.onbeforeunload = () =>
                        this.translate.instant('sitnet_unsaved_data_may_be_lost');
                },
                error => toast.error(error.data),
            );
        }
    }

    clearListeners = () => {
        this.window.nativeWindow.onbeforeunload = null;
        delete this.transitionWatcher;
    };

    hasNoCorrectOption = () =>
        this.question.type === 'MultipleChoiceQuestion' && this.question.options.every(o => !o.correctOption);

    saveQuestion = () => {
        this.question.questionOwners = this.currentOwners;
        const fn = (q: Question | QuestionDraft) => {
            this.clearListeners();
            if (this.onSave) {
                this.onSave.emit(q);
            }
        };

        if (this.collaborative) {
            fn(this.question);
        } else if (this.newQuestion) {
            this.Question.createQuestion(this.question as QuestionDraft).then(fn, error => toast.error(error.data));
        } else {
            this.Question.updateQuestion(this.question as Question).then(
                () => fn(this.question),
                error => toast.error(error.data),
            );
        }
    };

    cancel = () => {
        toast.info(this.translate.instant('sitnet_canceled'));
        // Call off the event listener so it won't ask confirmation now that we are going away
        this.clearListeners();
        this.onCancel.emit();
    };
}
