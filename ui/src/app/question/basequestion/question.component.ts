// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CanComponentDeactivate } from 'src/app/question/has-unsaved-changes.quard';
import { QuestionPreviewDialogComponent } from 'src/app/question/preview/question-preview-dialog.component';
import type { QuestionDraft } from 'src/app/question/question.model';
import { ExamSectionQuestion, Question, ReverseQuestion } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import type { User } from 'src/app/session/session.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { HistoryBackComponent } from 'src/app/shared/history/history-back.component';
import { QuestionBodyComponent } from './question-body.component';

@Component({
    selector: 'xm-question',
    templateUrl: './question.component.html',
    styleUrls: ['../question.shared.scss'],
    standalone: true,
    imports: [
        FormsModule,
        QuestionBodyComponent,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
        HistoryBackComponent,
    ],
})
export class QuestionComponent implements OnInit, OnDestroy, CanComponentDeactivate {
    @Input() newQuestion = false;
    @Input() questionId = 0;
    @Input() questionDraft!: Question;
    @Input() lotteryOn = false;
    @Input() collaborative = false;
    @Input() examId = 0;
    @Input() sectionQuestion?: ExamSectionQuestion;

    @Output() saved = new EventEmitter<Question | QuestionDraft>();
    @Output() cancelled = new EventEmitter<void>();

    @ViewChild('questionForm', { static: false }) questionForm?: NgForm;

    currentOwners: User[] = [];
    question!: ReverseQuestion | QuestionDraft;
    cancelClicked = false;
    nextState = '';

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private toast: ToastrService,
        private Question: QuestionService,
        private modal: NgbModal,
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

    openPreview = () => {
        const modal = this.modal.open(QuestionPreviewDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modal.componentInstance.question = this.sectionQuestion || this.question;
        modal.componentInstance.isExamQuestion = this.sectionQuestion;
    };

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
        if (this.questionForm?.dirty) event.preventDefault();
    };
}
