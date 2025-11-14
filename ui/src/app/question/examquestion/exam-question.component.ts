// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionPreviewDialogComponent } from 'src/app/question/preview/question-preview-dialog.component';
import { QuestionBasicInfoComponent } from 'src/app/question/question-basic-info.component';
import { QuestionUsageComponent } from 'src/app/question/question-usage.component';
import type { ExamSectionQuestion, Question, ReverseQuestion } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import type { QuestionAdditionalInfoConfig } from 'src/app/question/shared/question-additional-info.component';
import { QuestionAdditionalInfoComponent } from 'src/app/question/shared/question-additional-info.component';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';
import { ClaimChoiceComponent } from './claim-choice.component';
import { EssayComponent } from './essay.component';
import { MultiChoiceComponent } from './multichoice.component';
import { WeightedMultiChoiceComponent } from './weighted-multichoice.component';

// This component depicts a distributed exam question. Only used thru a modal.
@Component({
    selector: 'xm-exam-question',
    templateUrl: './exam-question.component.html',
    styleUrls: ['../question.shared.scss'],
    imports: [
        ReactiveFormsModule,
        FixedPrecisionValidatorDirective,
        TranslateModule,
        QuestionBasicInfoComponent,
        QuestionUsageComponent,
        QuestionAdditionalInfoComponent,
        EssayComponent,
        WeightedMultiChoiceComponent,
        MultiChoiceComponent,
        ClaimChoiceComponent,
    ],
})
export class ExamQuestionComponent implements OnDestroy {
    questionForm: FormGroup;
    examQuestion = model<ExamSectionQuestion | undefined>(undefined);
    lotteryOn = input(false);
    saved = output<{ question: Question; examQuestion: ExamSectionQuestion }>();
    cancelled = output<{ dirty: boolean }>();

    question = signal<ReverseQuestion | undefined>(undefined);
    examNames = signal<string[]>([]);
    sectionNames = signal<string[]>([]);
    isInPublishedExam = signal(false);

    additionalInfoConfig = computed<QuestionAdditionalInfoConfig | undefined>(() => {
        const q = this.question();
        const eq = this.examQuestion();
        if (!q) {
            return undefined; // Return undefined until question is loaded
        }
        return {
            showWarning: this.showWarning(),
            onSelectFile: () => this.selectFile(),
            onDownloadAttachment: () => this.downloadQuestionAttachment(),
            onRemoveAttachment: () => this.removeQuestionAttachment(),
            getFileSize: () => this.getFileSize(),
            question: q,
            instructionsValue: eq?.answerInstructions || '',
            onInstructionsChange: (value: string) => {
                if (eq) {
                    this.examQuestion.set({ ...eq, answerInstructions: value });
                }
            },
            owners: q.questionOwners,
            ownersReadOnly: true,
            showOwners: true,
            tags: q.tags.filter((tag) => tag.id !== undefined).map((tag) => ({ id: tag.id!, name: tag.name })),
            tagsReadOnly: true,
            showTags: true,
            sectionNames: this.sectionNames(),
            showSections: true,
            sectionsDisplayFormat: 'list',
        };
    });

    private http = inject(HttpClient);
    private Question = inject(QuestionService);
    private Attachment = inject(AttachmentService);
    private modal = inject(ModalService);
    private formInitialized = signal(false);

    constructor() {
        // Initialize reactive form
        this.questionForm = new FormGroup({
            maxScore: new FormControl(null, [Validators.min(0), Validators.max(1000)]),
        });

        // Sync form with examQuestion model signal
        effect(() => {
            const eq = this.examQuestion();
            if (eq) {
                if (!this.formInitialized()) {
                    // Use reset() during initialization to mark form as pristine
                    this.questionForm.reset({ maxScore: eq.maxScore || null }, { emitEvent: false });
                    this.formInitialized.set(true);
                } else {
                    // Only sync from question → form if form is pristine
                    // If form is dirty, user has made changes - don't overwrite them
                    if (this.questionForm.pristine) {
                        this.questionForm.patchValue({ maxScore: eq.maxScore || null }, { emitEvent: false });
                    }
                }
            }
        });

        // Sync form changes back to examQuestion model signal
        this.questionForm.get('maxScore')?.valueChanges.subscribe((value) => {
            const eq = this.examQuestion();
            if (eq !== undefined && eq.maxScore !== value) {
                this.examQuestion.set({ ...eq, maxScore: value ?? 0 });
            }
        });

        // Update disabled state when lotteryOn changes
        effect(() => {
            const maxScoreControl = this.questionForm.get('maxScore');
            if (maxScoreControl) {
                if (this.lotteryOn()) {
                    maxScoreControl.disable({ emitEvent: false });
                } else {
                    maxScoreControl.enable({ emitEvent: false });
                }
            }
        });

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
        // Clean up temporary negative IDs before sending to server
        const examQuestionValue = this.examQuestion();
        if (!examQuestionValue) return;
        const cleanedExamQuestion = {
            ...examQuestionValue,
            options: examQuestionValue.options.map((opt) => ({
                ...opt,
                id: opt.id && opt.id < 0 ? undefined : opt.id,
            })),
        };

        const q = this.question();
        if (!q) return;
        this.saved.emit({
            question: q,
            examQuestion: cleanedExamQuestion as ExamSectionQuestion,
        });
    };

    setText = ($event: string) => {
        const q = this.question();
        if (q) this.question.set({ ...q, question: $event });
    };

    cancel = () => this.cancelled.emit({ dirty: this.questionForm.dirty });

    openPreview$ = () => {
        const modal = this.modal.openRef(QuestionPreviewDialogComponent, { size: 'lg' });
        const examQuestionValue = this.examQuestion();
        if (!examQuestionValue) return this.modal.result$<void>(modal);
        modal.componentInstance.question.set(examQuestionValue);
        modal.componentInstance.isExamQuestion.set(true);
        return this.modal.result$<void>(modal);
    };

    showWarning = () => this.examNames().length > 1;

    updateEvaluationType = ($event: string | undefined) => {
        // evaluationType is already updated via two-way binding [(evaluationType)]
        // Only handle side effect: set maxScore to 0 when switching to Selection
        // The effect will sync this to the form automatically
        if ($event === 'Selection') {
            const examQuestionValue = this.examQuestion();
            if (examQuestionValue) {
                this.examQuestion.set({ ...examQuestionValue, maxScore: 0 });
            }
        }
    };
    // expectedWordCount and evaluationCriteria are handled via two-way binding
    // No separate handlers needed

    selectFile = () =>
        this.Attachment.selectFile$(true).subscribe((data) => {
            const q = this.question();
            if (!q) {
                return;
            }
            this.question.set({
                ...q,
                attachment: {
                    ...q.attachment,
                    modified: true,
                    fileName: data.$value.attachmentFile.name,
                    size: data.$value.attachmentFile.size,
                    file: data.$value.attachmentFile,
                    removed: false,
                },
            });
        });

    downloadQuestionAttachment = () => {
        const q = this.question();
        if (q) this.Attachment.downloadQuestionAttachment(q);
    };

    removeQuestionAttachment = () => {
        const q = this.question();
        if (q) this.Attachment.removeQuestionAttachment(q);
    };

    getFileSize = () => {
        const q = this.question();
        return !q?.attachment?.file ? 0 : this.Attachment.getFileSize(q.attachment.file.size);
    };

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
            this.question.set(question);
            const sections = question.examSectionQuestions.map((esq) => esq.examSection);
            const examNames = sections.map((s) => {
                if (s.exam.state === 'PUBLISHED') {
                    this.isInPublishedExam.set(true);
                }
                return s.exam.name as string;
            });
            const sectionNames = sections.map((s) => s.name);
            // remove duplicates
            this.examNames.set(examNames.filter((n, pos) => examNames.indexOf(n) === pos).sort());
            this.sectionNames.set(sectionNames.filter((n, pos) => sectionNames.indexOf(n) === pos));
            window.addEventListener('beforeunload', this.onUnload);
        });
    };

    private onUnload = (event: BeforeUnloadEvent) => {
        if (this.questionForm.dirty) event.preventDefault();
    };
}
