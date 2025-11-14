// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CanComponentDeactivate } from 'src/app/question/has-unsaved-changes.guard';
import type { QuestionDraft, Tag } from 'src/app/question/question.model';
import { Question, ReverseQuestion } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import type { User } from 'src/app/session/session.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { HistoryBackComponent } from 'src/app/shared/history/history-back.component';
import { QuestionBodyTrialComponent } from './question-body.component';

@Component({
    selector: 'xm-question-trial',
    templateUrl: './question.component.html',
    styleUrls: ['../question/question.shared.scss'],
    imports: [
        ReactiveFormsModule,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
        HistoryBackComponent,
        QuestionBodyTrialComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionTrialComponent implements CanComponentDeactivate {
    // Main form - single source of truth
    questionForm = new FormGroup({});

    // Inputs - can be set via router or modal
    newQuestionInput = input(false);
    questionId = input(0);
    questionDraft = input<Question>();
    lotteryOn = input(false);
    collaborative = input(false);
    examId = input(0);
    isPopup = input(false);

    // Outputs
    saved = output<Question | QuestionDraft>();
    cancelled = output<void>();

    // Computed signal that reads from route data first, then falls back to input signal
    newQuestion = computed(() => {
        const routeData = this.route.snapshot.data['newQuestion'];
        if (routeData !== undefined) {
            return routeData;
        }
        return this.newQuestionInput();
    });

    // Computed signal for questionId from route params
    routeQuestionId = computed(() => {
        const routeId = this.route.snapshot.paramMap.get('id');
        if (routeId) {
            return Number(routeId);
        }
        return this.questionId();
    });

    // Current question data (loaded from server or draft)
    currentQuestion = signal<ReverseQuestion | QuestionDraft | undefined>(undefined);
    currentOwners = signal<User[]>([]);
    currentTags = signal<Tag[]>([]);

    questionTypes = [
        { type: 'EssayQuestion', name: 'i18n_toolbar_essay_question' },
        { type: 'ClozeTestQuestion', name: 'i18n_toolbar_cloze_test_question' },
        { type: 'MultipleChoiceQuestion', name: 'i18n_toolbar_multiplechoice_question' },
        { type: 'WeightedMultipleChoiceQuestion', name: 'i18n_toolbar_weighted_multiplechoice_question' },
        { type: 'ClaimChoiceQuestion', name: 'i18n_toolbar_claim_choice_question' },
    ];

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private toast = inject(ToastrService);
    private Question = inject(QuestionService);

    constructor() {
        this.loadQuestion();
    }

    canDeactivate(): boolean {
        return !this.questionForm.dirty;
    }

    saveQuestion() {
        const currentQuestionValue = this.currentQuestion();
        if (!currentQuestionValue || !this.questionForm.valid) {
            return;
        }

        // Read all form values - form is single source of truth
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
                claimChoice?: {
                    options?: Array<{ optionText?: string; score?: number; isSkipOption?: boolean }>;
                };
            };
        };
        const questionBody = formValue.questionBody || {};
        const baseInformation = questionBody.baseInformation || {};
        const additionalInfo = questionBody.additionalInfo || {};
        const essay = questionBody.essay || {};
        const multipleChoice = questionBody.multipleChoice || {};

        // For claimChoice, use getRawValue() to include disabled controls (skip option text)
        // This is safe because we only read the specific claimChoice form group
        const questionBodyControl = this.questionForm.get('questionBody');
        const claimChoiceControl =
            questionBodyControl instanceof FormGroup ? questionBodyControl.get('claimChoice') : null;
        const claimChoice =
            claimChoiceControl instanceof FormGroup
                ? (claimChoiceControl.getRawValue() as {
                      options?: Array<{ optionText?: string; score?: number; isSkipOption?: boolean }>;
                  })
                : {};

        // Map claimChoice form options back to question options
        let updatedOptions = currentQuestionValue.options;
        if (claimChoice.options && claimChoice.options.length > 0) {
            updatedOptions = currentQuestionValue.options.map((opt, index) => {
                const formOption = claimChoice.options![index];
                if (formOption) {
                    const optionText = formOption.optionText || '';
                    const score = formOption.score ?? 0;
                    const isSkipOption = formOption.isSkipOption || opt.claimChoiceType === 'SkipOption';

                    // Determine claimChoiceType based on score
                    let claimChoiceType = opt.claimChoiceType;
                    let correctOption = opt.correctOption;
                    if (isSkipOption) {
                        claimChoiceType = 'SkipOption';
                        correctOption = false;
                    } else if (score <= 0) {
                        claimChoiceType = 'IncorrectOption';
                        correctOption = false;
                    } else if (score > 0) {
                        claimChoiceType = 'CorrectOption';
                        correctOption = true;
                    }

                    return {
                        ...opt,
                        option: optionText,
                        defaultScore: score,
                        claimChoiceType,
                        correctOption,
                    };
                }
                return opt;
            });
        }

        // Map multipleChoice form options back to question options
        if (multipleChoice.options && multipleChoice.options.length > 0) {
            updatedOptions = multipleChoice.options.map((formOption, index) => {
                const existingOption = currentQuestionValue.options[index];
                // correctOption should be a boolean value from the form
                const correctOptionValue = formOption.correctOption === true;
                return {
                    ...(existingOption || {}),
                    option: formOption.optionText || '',
                    correctOption: correctOptionValue,
                    defaultScore: existingOption?.defaultScore ?? 0,
                };
            });
        }

        const updatedQuestion: Question | QuestionDraft = {
            ...currentQuestionValue,
            question: baseInformation.questionText || currentQuestionValue.question,
            type: baseInformation.questionType || currentQuestionValue.type,
            defaultMaxScore: questionBody.defaultMaxScore ?? currentQuestionValue.defaultMaxScore,
            defaultAnswerInstructions: additionalInfo.instructions ?? currentQuestionValue.defaultAnswerInstructions,
            defaultEvaluationCriteria:
                additionalInfo.evaluationCriteria ?? currentQuestionValue.defaultEvaluationCriteria,
            questionOwners: this.currentOwners(),
            tags: this.currentTags(),
            options: updatedOptions,
            // Multiple Choice-specific fields
            defaultNegativeScoreAllowed:
                multipleChoice.defaultNegativeScoreAllowed ?? currentQuestionValue.defaultNegativeScoreAllowed,
            defaultOptionShufflingOn:
                multipleChoice.defaultOptionShufflingOn ?? currentQuestionValue.defaultOptionShufflingOn,
            // Essay-specific fields
            defaultExpectedWordCount: essay.defaultExpectedWordCount ?? currentQuestionValue.defaultExpectedWordCount,
            defaultEvaluationType: essay.defaultEvaluationType ?? currentQuestionValue.defaultEvaluationType,
        };

        // Save to server
        if (this.newQuestion()) {
            this.Question.createQuestion$(updatedQuestion as QuestionDraft).subscribe({
                next: (q) => fn(q),
                error: (error: unknown) => this.toast.error(String(error)),
            });
        } else {
            this.Question.updateQuestion$(updatedQuestion as Question).subscribe({
                next: (q) => fn(q),
                error: (error: unknown) => this.toast.error(String(error)),
            });
        }
        const fn = (q: Question | QuestionDraft) => {
            this.questionForm.markAsPristine();
            const nextState = this.route.snapshot.queryParamMap.get('nextState');
            if (nextState) {
                this.router.navigate(['/staff', nextState]);
            } else {
                this.saved.emit(q);
            }
        };
    }

    cancel() {
        // Just initiate navigation/close - guard will check dirty state
        const nextState = this.route.snapshot.queryParamMap.get('nextState');
        if (nextState) {
            this.router.navigate(['/staff', ...nextState.split('/')]);
        } else {
            this.cancelled.emit();
        }
    }

    onTagsChange(tags: Tag[]) {
        this.currentTags.set(tags);
        // Update question object so tags component can display current tags
        const questionValue = this.currentQuestion();
        if (questionValue) {
            this.currentQuestion.set({ ...questionValue, tags });
        }
    }

    private loadQuestion() {
        const newQuestion = this.newQuestion();
        const questionId = this.routeQuestionId();
        const questionDraft = this.questionDraft();

        if (newQuestion && questionDraft) {
            // New question from draft - convert to ReverseQuestion format
            this.currentQuestion.set({ ...questionDraft, examSectionQuestions: [] } as ReverseQuestion);
            this.currentOwners.set(questionDraft.questionOwners || []);
            this.currentTags.set(questionDraft.tags || []);
            this.initializeForm();
        } else if (questionId > 0) {
            // Load existing question
            this.Question.getQuestion(questionId).subscribe({
                next: (question: ReverseQuestion) => {
                    this.currentQuestion.set(question);
                    this.currentOwners.set(question.questionOwners || []);
                    this.currentTags.set(question.tags || []);
                    this.initializeForm();
                },
                error: (err: unknown) => this.toast.error(String(err)),
            });
        } else if (newQuestion) {
            // New question without draft - create empty draft
            this.currentQuestion.set({
                id: undefined,
                type: '',
                question: '',
                options: [],
                tags: [],
                questionOwners: [],
                state: 'DRAFT',
                defaultMaxScore: 0,
                defaultNegativeScoreAllowed: false,
                defaultOptionShufflingOn: false,
                examSectionQuestions: [],
            } as QuestionDraft);
            this.currentOwners.set([]);
            this.currentTags.set([]);
            this.initializeForm();
        }
    }

    private initializeForm() {
        // Form will be initialized by child components
        // They will add their form groups to questionForm
    }
}
