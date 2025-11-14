// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, input, model, OnDestroy, output, signal } from '@angular/core';
import { FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionBodyComponent } from 'src/app/question/editor/common/question-body.component';
import { QuestionAdapterService } from 'src/app/question/editor/common/tools/question-adapter.service';
import { QuestionPreviewDialogComponent } from 'src/app/question/preview/question-preview-dialog.component';
import type { ExamSectionQuestion, Question, ReverseQuestion } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';

// This component depicts a distributed exam question. Only used thru a modal.
@Component({
    selector: 'xm-exam-question',
    templateUrl: './exam-question.component.html',
    styleUrls: ['../question.shared.scss'],
    viewProviders: [{ provide: FormGroupDirective, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, TranslateModule, QuestionBodyComponent],
})
export class ExamQuestionComponent implements OnDestroy {
    questionForm = new FormGroup({});
    examQuestion = model<ExamSectionQuestion | undefined>(undefined);
    lotteryOn = input(false);
    saved = output<{ question: Question; examQuestion: ExamSectionQuestion }>();
    cancelled = output<{ dirty: boolean }>();

    // Adapted question for QuestionBodyComponent (uses ReverseQuestion format)
    adaptedQuestion = computed(() => {
        const eq = this.examQuestion();
        const baseQ = this.baseQuestion();
        if (eq && baseQ) {
            return this.adapter.examQuestionToReverseQuestion(eq, baseQ);
        }
        return undefined;
    });

    // Extract exam names and section names from base question
    examNames = computed(() => {
        const baseQ = this.baseQuestion();
        if (!baseQ) return [];
        const names = baseQ.examSectionQuestions.map((esq) => esq.examSection.exam.name as string);
        return names.filter((n, pos) => names.indexOf(n) === pos).sort();
    });

    sectionNames = computed(() => {
        const baseQ = this.baseQuestion();
        if (!baseQ) return [];
        const names = baseQ.examSectionQuestions.map((esq) => esq.examSection.name);
        return names.filter((n, pos) => names.indexOf(n) === pos);
    });

    isInPublishedExam = computed(() => {
        const baseQ = this.baseQuestion();
        if (!baseQ) return false;
        return baseQ.examSectionQuestions.some((esq) => esq.examSection.exam.state === 'PUBLISHED');
    });

    // Base question (from server) - needed for adapter conversions
    private baseQuestion = signal<ReverseQuestion | undefined>(undefined);

    private http = inject(HttpClient);
    private Question = inject(QuestionService);
    private modal = inject(ModalService);
    private adapter = inject(QuestionAdapterService);

    constructor() {
        // Initialize question data when examQuestion becomes available
        effect(() => {
            const eq = this.examQuestion();
            if (eq) {
                this.init();
            }
        });
    }

    ngOnDestroy() {
        window.removeEventListener('beforeunload', this.onUnload);
    }

    save = () => {
        const examQuestionValue = this.examQuestion();
        const baseQuestionValue = this.baseQuestion();
        if (!examQuestionValue || !baseQuestionValue || !this.questionForm.valid) {
            return;
        }

        // Read form values from QuestionBodyComponent
        const formValue = this.questionForm.value as {
            questionBody?: {
                defaultMaxScore?: number | null;
                baseInformation?: { questionText?: string; questionType?: string };
                additionalInfo?: { instructions?: string; evaluationCriteria?: string };
                essay?: {
                    defaultExpectedWordCount?: number | null;
                    defaultEvaluationType?: string;
                };
                multipleChoice?: {
                    defaultNegativeScoreAllowed?: boolean;
                    defaultOptionShufflingOn?: boolean;
                    options?: Array<{ optionText?: string; correctOption?: boolean }>;
                };
                weightedMc?: {
                    negativeScore?: boolean;
                    optionShuffling?: boolean;
                    options?: Array<{ optionText?: string; defaultScore?: number }>;
                };
                claimChoice?: {
                    options?: Array<{ optionText?: string; score?: number; isSkipOption?: boolean }>;
                };
            };
        };

        // For claimChoice, use getRawValue() to include disabled controls (skip option text)
        const questionBodyControl = this.questionForm.get('questionBody');
        if (questionBodyControl instanceof FormGroup) {
            const claimChoiceControl = questionBodyControl.get('claimChoice');
            if (claimChoiceControl instanceof FormGroup) {
                const claimChoiceRaw = claimChoiceControl.getRawValue() as {
                    options?: Array<{ optionText?: string; score?: number; isSkipOption?: boolean }>;
                };
                if (claimChoiceRaw.options) {
                    formValue.questionBody = formValue.questionBody || {};
                    formValue.questionBody.claimChoice = claimChoiceRaw;
                }
            }
        }

        // Use adapter to convert form values to ExamSectionQuestion updates
        const updates = this.adapter.formValuesToExamQuestionUpdates(formValue, examQuestionValue, baseQuestionValue);

        // Merge updates with current examQuestion
        const updatedExamQuestion: ExamSectionQuestion = {
            ...examQuestionValue,
            ...updates,
            // Clean up temporary negative IDs
            options: (updates.options || examQuestionValue.options).map((opt) => ({
                ...opt,
                id: opt.id && opt.id < 0 ? undefined : opt.id,
            })),
        };

        // Update base question if questionText or questionType changed
        let updatedBaseQuestion = baseQuestionValue;
        if (formValue.questionBody?.baseInformation) {
            const baseInfo = formValue.questionBody.baseInformation;
            if (baseInfo.questionText !== undefined || baseInfo.questionType !== undefined) {
                updatedBaseQuestion = {
                    ...baseQuestionValue,
                    question: baseInfo.questionText ?? baseQuestionValue.question,
                    type: baseInfo.questionType ?? baseQuestionValue.type,
                };
            }
        }

        // Convert ReverseQuestion to Question for output (id is always defined for existing questions)
        const questionForOutput: Question = {
            ...updatedBaseQuestion,
            id: updatedBaseQuestion.id!,
        };

        this.saved.emit({
            question: questionForOutput,
            examQuestion: updatedExamQuestion,
        });
    };

    cancel = () => this.cancelled.emit({ dirty: this.questionForm.dirty });

    openPreview$ = () => {
        const modal = this.modal.openRef(QuestionPreviewDialogComponent, { size: 'lg' });
        const adaptedQ = this.adaptedQuestion();
        if (!adaptedQ) return this.modal.result$<void>(modal);
        modal.componentInstance.question.set(adaptedQ);
        modal.componentInstance.isExamQuestion.set(true);
        return this.modal.result$<void>(modal);
    };

    showWarning = () => this.examNames().length > 1;

    hasInvalidClaimChoiceOptions = () => {
        const examQuestionValue = this.examQuestion();
        if (!examQuestionValue) return false;
        return (
            examQuestionValue.question.type === 'ClaimChoiceQuestion' &&
            this.Question.getInvalidDistributedClaimOptionTypes(examQuestionValue.options).length > 0
        );
    };

    private init = () => {
        const examQuestionValue = this.examQuestion();
        if (!examQuestionValue) return;
        this.http.get<ReverseQuestion>(`/app/questions/${examQuestionValue.question.id}`).subscribe((question) => {
            this.baseQuestion.set(question);
            window.addEventListener('beforeunload', this.onUnload);
        });
    };

    private onUnload = (event: BeforeUnloadEvent) => {
        if (this.questionForm.dirty) event.preventDefault();
    };
}
