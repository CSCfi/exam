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
import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService, TransitionService, UIRouterGlobals } from '@uirouter/core';
import { clone } from 'lodash';
import { ToastrService } from 'ngx-toastr';
import type { ExamSectionQuestion, Question, ReverseQuestion } from '../../exam/exam.model';
import type { User } from '../../session/session.service';
import { ConfirmationDialogService } from '../../utility/dialogs/confirmationDialog.service';
import { WindowRef } from '../../utility/window/window.service';
import type { QuestionDraft } from '../question.service';
import { QuestionService } from '../question.service';

@Component({
    selector: 'question',
    templateUrl: './question.component.html',
})
export class QuestionComponent implements OnInit, OnDestroy {
    @Input() newQuestion = false;
    @Input() questionId = 0;
    @Input() questionDraft!: Question;
    @Input() lotteryOn = false;
    @Input() collaborative = false;
    @Input() examId = 0;
    @Input() sectionQuestion!: ExamSectionQuestion;
    @Input() nextState?: string;

    @Output() saved = new EventEmitter<Question | QuestionDraft>();
    @Output() cancelled = new EventEmitter<void>();

    currentOwners: User[] = [];
    question!: ReverseQuestion | QuestionDraft;
    transitionWatcher?: unknown;

    constructor(
        private state: StateService,
        private routing: UIRouterGlobals,
        private transition: TransitionService,
        private translate: TranslateService,
        private toast: ToastrService,
        private window: WindowRef,
        private dialogs: ConfirmationDialogService,
        private Question: QuestionService,
    ) {
        this.transitionWatcher = this.transition.onBefore({}, () => {
            if (this.window.nativeWindow.onbeforeunload) {
                // we got changes in the model, ask confirmation
                return this.dialogs
                    .open(
                        this.translate.instant('sitnet_confirm_exit'),
                        this.translate.instant('sitnet_unsaved_question_data'),
                    )
                    .result.then(() => {
                        // ok to reroute
                        this.window.nativeWindow.onbeforeunload = null;
                        delete this.transitionWatcher;
                    });
            } else {
                this.window.nativeWindow.onbeforeunload = null;
                return true;
            }
        });
    }

    ngOnInit() {
        this.nextState = this.nextState || this.routing.params.nextState;
        this.currentOwners = [];
        if (this.newQuestion) {
            this.question = this.Question.getQuestionDraft();
            this.currentOwners = clone(this.question.questionOwners);
        } else if (this.questionDraft && this.collaborative) {
            this.question = { ...this.questionDraft, examSectionQuestions: [] };
            this.currentOwners = clone(this.question.questionOwners);
            this.window.nativeWindow.onbeforeunload = () => this.translate.instant('sitnet_unsaved_data_may_be_lost');
        } else {
            this.Question.getQuestion(this.questionId || this.state.params.id).subscribe(
                (question: ReverseQuestion) => {
                    this.question = question;
                    this.currentOwners = clone(this.question.questionOwners);
                    this.window.nativeWindow.onbeforeunload = () =>
                        this.translate.instant('sitnet_unsaved_data_may_be_lost');
                },
                (error) => this.toast.error(error),
            );
        }
    }

    ngOnDestroy() {
        this.clearListeners();
    }

    clearListeners = () => {
        this.window.nativeWindow.onbeforeunload = null;
        delete this.transitionWatcher;
    };

    hasNoCorrectOption = () =>
        this.question.type === 'MultipleChoiceQuestion' && this.question.options.every((o) => !o.correctOption);

    hasInvalidClaimChoiceOptions = () =>
        this.question.type === 'ClaimChoiceQuestion' &&
        this.Question.getInvalidClaimOptionTypes(this.question.options).length > 0;

    saveQuestion = () => {
        this.question.questionOwners = this.currentOwners;
        const fn = (q: Question | QuestionDraft) => {
            this.clearListeners();
            if (this.nextState) {
                this.state.go(this.nextState);
            } else if (this.saved) {
                this.saved.emit(q);
            }
        };

        if (this.collaborative) {
            fn(this.question);
        } else if (this.newQuestion) {
            this.Question.createQuestion(this.question as QuestionDraft).then(fn, (error) => this.toast.error(error));
        } else {
            this.Question.updateQuestion(this.question as Question).then(
                () => fn(this.question),
                (error) => this.toast.error(error),
            );
        }
    };

    cancel = () => {
        this.toast.info(this.translate.instant('sitnet_canceled'));
        // Call off the event listener so it won't ask confirmation now that we are going away
        this.clearListeners();
        if (this.nextState) {
            this.state.go(this.nextState);
        } else if (this.cancelled) {
            this.cancelled.emit();
        }
    };
}
