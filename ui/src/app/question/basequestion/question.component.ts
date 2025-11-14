// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
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
        ReactiveFormsModule,
        QuestionBodyComponent,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
        HistoryBackComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionComponent implements OnDestroy, CanComponentDeactivate {
    questionForm = new FormGroup({});

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
    // When opened as a modal, route data is not available, so check route data first
    // If route data doesn't exist, it's likely a modal context, so use input signal
    newQuestion = computed(() => {
        const routeData = this.route.snapshot.data.newQuestion;
        // If route data exists, use it (router context)
        if (routeData !== undefined) {
            return routeData;
        }
        // Otherwise, use input signal (modal context or no route data)
        // This handles the case where isPopup is set after component initialization
        return this.newQuestionInput();
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

    private initialized = signal(false);
    private formInitialized = signal(false);

    constructor() {
        // Initialize nextState from route (only available in router context)
        const nextStateValue = this.route.snapshot.queryParamMap.get('nextState') || this.route.snapshot.data.nextState;
        if (nextStateValue) {
            this.nextState.set(nextStateValue);
        }

        // Use effect to initialize question data after inputs are set
        // This handles the case where component is opened as modal and inputs are set after construction
        effect(() => {
            // Only initialize once
            if (this.initialized()) {
                return;
            }

            const currentNewQuestion = this.newQuestion();
            const currentQuestionDraft = this.questionDraft();
            const currentCollaborative = this.collaborative();
            const currentQuestionId = this.questionId();
            const currentIsPopup = this.isPopup();

            // For modal context, wait until isPopup is set (or if it's router context, proceed)
            // If isPopup is false and we're in a modal, inputs haven't been set yet
            const routeData = this.route.snapshot.data.newQuestion;
            const isRouterContext = routeData !== undefined;

            // If we're in a modal (no route data) and isPopup is still false, wait
            if (!isRouterContext && !currentIsPopup) {
                return;
            }

            // Mark as initialized to prevent re-running
            this.initialized.set(true);
            this.currentOwners.set([]);

            if (currentNewQuestion) {
                const questionDraft = this.Question.getQuestionDraft();
                this.question.set(questionDraft);
                this.currentOwners.set([...questionDraft.questionOwners]);
            } else if (currentQuestionDraft && currentCollaborative) {
                const questionValue = { ...currentQuestionDraft, examSectionQuestions: [] };
                this.question.set(questionValue);
                this.currentOwners.set([...questionValue.questionOwners]);
            } else {
                const id = this.route.snapshot.paramMap.get('id');
                this.Question.getQuestion(currentQuestionId || Number(id)).subscribe({
                    next: (question: ReverseQuestion) => {
                        this.question.set(question);
                        this.currentOwners.set([...question.questionOwners]);
                        window.addEventListener('beforeunload', this.onUnload);
                    },
                    error: (err) => this.toast.error(err),
                });
            }
        });

        // Mark form as initialized after question is loaded
        // Child forms now use reset() instead of patchValue(), so they're already pristine
        effect(() => {
            const q = this.question();
            if (q && !this.formInitialized()) {
                // Use setTimeout to ensure all child forms have been initialized
                setTimeout(() => {
                    this.formInitialized.set(true);
                }, 0);
            }
        });
    }

    ngOnDestroy() {
        window.removeEventListener('beforeunload', this.onUnload);
    }

    canDeactivate(): boolean {
        // Allow deactivation if form is not dirty (no unsaved changes)
        // Also allow if form hasn't been initialized yet (still loading)
        if (!this.formInitialized()) {
            return true;
        }
        // Parent form dirty state automatically includes nested forms
        return !this.questionForm.dirty;
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

        const questionBodyControl = this.questionForm.get('questionBody');
        const questionBodyForm = questionBodyControl instanceof FormGroup ? questionBodyControl : null;

        // Read form values and sync to question object
        const defaultMaxScore = questionBodyForm?.get('defaultMaxScore')?.value ?? null;

        const updatedQuestion = {
            ...questionValue,
            defaultMaxScore: defaultMaxScore,
            questionOwners: this.currentOwners(),
        };
        const fn = (q: Question | QuestionDraft) => {
            // Update question signal with saved values
            this.question.set(q as ReverseQuestion | QuestionDraft);
            // Mark form as pristine after successful save
            this.questionForm.markAsPristine();
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
        // Just initiate routing change - guard will ask for confirmation if dirty
        // Leave form state intact (don't mark pristine)
        const nextStateValue = this.nextState();
        if (nextStateValue) {
            // Navigation will trigger canDeactivate guard BEFORE navigation happens
            // Guard will ask for confirmation if form is dirty
            this.router.navigate(['/staff', ...nextStateValue.split('/')]);
        } else {
            // No navigation, just emit cancelled event
            // Parent component (e.g., modal) can decide what to do
            // Don't mark pristine - leave form state intact
            this.cancelled.emit();
        }
    }

    private onUnload = (event: BeforeUnloadEvent) => {
        if (this.questionForm.dirty) event.preventDefault();
    };
}
