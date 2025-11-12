// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    ViewChild,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CanComponentDeactivate } from 'src/app/question/has-unsaved-changes.guard';
import { QuestionPreviewDialogComponent } from 'src/app/question/preview/question-preview-dialog.component';
import type { QuestionDraft } from 'src/app/question/question.model';
import { ExamSectionQuestion, Question, ReverseQuestion } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import type { User } from 'src/app/session/session.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { HistoryBackComponent } from 'src/app/shared/history/history-back.component';
import { QuestionBodyComponent } from './question-body.component';

@Component({
    selector: 'xm-question',
    templateUrl: './question.component.html',
    styleUrls: ['../question.shared.scss'],
    imports: [
        FormsModule,
        QuestionBodyComponent,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
        HistoryBackComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionComponent implements OnDestroy, CanComponentDeactivate {
    @ViewChild('questionForm', { static: false }) questionForm?: NgForm;

    newQuestionInput = input(false);
    questionId = input(0);
    questionDraft = input<Question>();
    lotteryOn = input(false);
    collaborative = input(false);
    examId = input(0);
    sectionQuestion = input<ExamSectionQuestion>();
    isPopup = input(false);

    saved = output<Question | QuestionDraft>();
    cancelled = output<void>();

    // Computed signal that reads from route data first, then falls back to input signal
    // This handles the case where route data doesn't automatically bind to input signals
    newQuestion = computed(() => {
        const routeData = this.route.snapshot.data.newQuestion;
        return routeData !== undefined ? routeData : this.newQuestionInput();
    });

    currentOwners = signal<User[]>([]);
    question = signal<ReverseQuestion | QuestionDraft | undefined>(undefined);
    cancelClicked = signal(false);
    nextState = signal('');

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private toast = inject(ToastrService);
    private Question = inject(QuestionService);
    private modal = inject(ModalService);

    constructor() {
        const nextStateValue = this.route.snapshot.queryParamMap.get('nextState') || this.route.snapshot.data.nextState;
        if (nextStateValue) {
            this.nextState.set(nextStateValue);
        }

        const id = this.route.snapshot.paramMap.get('id');
        this.currentOwners.set([]);

        if (this.newQuestion()) {
            const questionDraft = this.Question.getQuestionDraft();
            this.question.set(questionDraft);
            this.currentOwners.set([...questionDraft.questionOwners]);
        } else if (this.questionDraft() && this.collaborative()) {
            const questionValue = { ...this.questionDraft()!, examSectionQuestions: [] };
            this.question.set(questionValue);
            this.currentOwners.set([...questionValue.questionOwners]);
        } else {
            this.Question.getQuestion(this.questionId() || Number(id)).subscribe({
                next: (question: ReverseQuestion) => {
                    this.question.set(question);
                    this.currentOwners.set([...question.questionOwners]);
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
        if (!this.cancelClicked() || !this.questionForm?.dirty) {
            return true;
        }
        return false;
    }

    hasNoCorrectOption() {
        const questionValue = this.question();
        return questionValue?.type === 'MultipleChoiceQuestion' && questionValue.options.every((o) => !o.correctOption);
    }

    hasInvalidClaimChoiceOptions() {
        const questionValue = this.question();
        return (
            questionValue?.type === 'ClaimChoiceQuestion' &&
            this.Question.getInvalidClaimOptionTypes(questionValue.options).length > 0
        );
    }

    openPreview$() {
        const questionValue = this.question();
        const sectionQuestionValue = this.sectionQuestion();
        const modal = this.modal.openRef(QuestionPreviewDialogComponent, { size: 'lg' });
        modal.componentInstance.question.set(sectionQuestionValue || questionValue!);
        modal.componentInstance.isExamQuestion.set(!!sectionQuestionValue);
        return this.modal.result$<void>(modal);
    }

    saveQuestion() {
        const questionValue = this.question();
        if (!questionValue) return;

        const updatedQuestion = {
            ...questionValue,
            questionOwners: this.currentOwners(),
        };
        const fn = (q: Question | QuestionDraft) => {
            const nextStateValue = this.nextState();
            if (nextStateValue) {
                this.router.navigate(['/staff', nextStateValue]);
            } else {
                this.saved.emit(q);
            }
        };

        if (this.collaborative()) {
            fn(updatedQuestion);
        } else if (this.newQuestion()) {
            this.Question.createQuestion$(updatedQuestion as QuestionDraft).subscribe({
                next: fn,
                error: (error) => this.toast.error(error),
            });
        } else {
            this.Question.updateQuestion$(updatedQuestion as Question).subscribe({
                next: () => fn(updatedQuestion),
                error: (error) => this.toast.error(error),
            });
        }
    }

    cancel() {
        this.cancelClicked.set(true);
        const nextStateValue = this.nextState();
        if (nextStateValue) {
            this.router.navigate(['/staff', ...nextStateValue.split('/')]);
        } else {
            this.cancelled.emit();
        }
    }

    private onUnload = (event: BeforeUnloadEvent) => {
        if (this.questionForm?.dirty) event.preventDefault();
    };
}
