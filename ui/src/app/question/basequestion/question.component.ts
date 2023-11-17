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
import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamSectionQuestion, Question, ReverseQuestion } from '../../exam/exam.model';
import type { User } from '../../session/session.service';
import { CanComponentDeactivate } from '../has-unsaved-changes.quard';
import type { QuestionDraft } from '../question.service';
import { QuestionService } from '../question.service';
import { QuestionBodyComponent } from './question-body.component';

@Component({
    selector: 'xm-question',
    templateUrl: './question.component.html',
    standalone: true,
    imports: [NgIf, FormsModule, QuestionBodyComponent, TranslateModule],
})
export class QuestionComponent implements OnInit, OnDestroy, CanComponentDeactivate {
    @Input() newQuestion = false;
    @Input() questionId = 0;
    @Input() questionDraft!: Question;
    @Input() lotteryOn = false;
    @Input() collaborative = false;
    @Input() examId = 0;
    @Input() sectionQuestion!: ExamSectionQuestion;

    @Output() saved = new EventEmitter<Question | QuestionDraft>();
    @Output() cancelled = new EventEmitter<void>();

    @ViewChild('questionForm', { static: false }) questionForm?: NgForm;

    currentOwners: User[] = [];
    question!: ReverseQuestion | QuestionDraft;
    transitionWatcher?: unknown;
    cancelClicked = false;
    nextState = '';

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private toast: ToastrService,
        private Question: QuestionService,
    ) {}

    ngOnInit() {
        this.nextState =
            this.nextState || this.route.snapshot.queryParamMap.get('nextState') || this.route.snapshot.data.nextState;
        this.newQuestion = this.newQuestion || this.route.snapshot.data.newQuestion;
        const id = this.route.snapshot.paramMap.get('id');
        this.currentOwners = [];
        if (this.newQuestion) {
            this.question = this.Question.getQuestionDraft();
            this.currentOwners = [...this.question.questionOwners];
        } else if (this.questionDraft && this.collaborative) {
            this.question = { ...this.questionDraft, examSectionQuestions: [] };
            this.currentOwners = [...this.question.questionOwners];
        } else {
            this.Question.getQuestion(this.questionId || Number(id)).subscribe({
                next: (question: ReverseQuestion) => {
                    this.question = question;
                    this.currentOwners = [...this.question.questionOwners];
                    window.addEventListener('beforeunload', this.onUnload);
                },
                error: (err) => this.toast.error(err),
            });
        }
    }

    ngOnDestroy() {
        window.removeEventListener('beforeunload', this.onUnload);
    }

    canDeactivate(): boolean {
        if (!this.cancelClicked || !this.questionForm?.dirty) {
            return true;
        }
        return false;
    }

    hasNoCorrectOption = () =>
        this.question.type === 'MultipleChoiceQuestion' && this.question.options.every((o) => !o.correctOption);

    hasInvalidClaimChoiceOptions = () =>
        this.question.type === 'ClaimChoiceQuestion' &&
        this.Question.getInvalidClaimOptionTypes(this.question.options).length > 0;

    saveQuestion = () => {
        this.question.questionOwners = this.currentOwners;
        const fn = (q: Question | QuestionDraft) => {
            if (this.nextState) {
                this.router.navigate(['/staff', this.nextState]);
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
        this.cancelClicked = true;
        if (this.nextState) {
            this.router.navigate(['/staff', ...this.nextState.split('/')]);
        } else if (this.cancelled) {
            this.cancelled.emit();
        }
    };

    private onUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        return this.questionForm?.dirty ? (event.returnValue = '') : null;
    };
}
