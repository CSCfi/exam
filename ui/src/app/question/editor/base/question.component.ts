// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    OnDestroy,
    output,
    signal,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { QuestionBodyComponent } from 'src/app/question/editor/common/question-body.component';
import { CanComponentDeactivate } from 'src/app/question/editor/common/tools/has-unsaved-changes.guard';
import type { MultipleChoiceOption, QuestionDraft, Tag } from 'src/app/question/question.model';
import { Question, ReverseQuestion } from 'src/app/question/question.model';
import { QuestionService } from 'src/app/question/question.service';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { HistoryBackComponent } from 'src/app/shared/history/history-back.component';

@Component({
    selector: 'xm-question',
    templateUrl: './question.component.html',
    styleUrls: ['../question.shared.scss'],
    imports: [
        ReactiveFormsModule,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
        HistoryBackComponent,
        QuestionBodyComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionComponent implements CanComponentDeactivate, OnDestroy {
    // Main form - single source of truth
    questionForm = new FormGroup({});

    // Inputs - simplified API
    // question: if provided, use it (existing question with id, or draft with id: undefined)
    // questionId: if provided and no question, load from server
    // If neither provided, create new empty question
    question = input<ReverseQuestion | QuestionDraft | undefined>(undefined);
    questionId = input<number | undefined>(undefined);
    lotteryOn = input(false);
    collaborative = input(false);
    examId = input(0);
    isPopup = input(false);

    // Outputs
    saved = output<ReverseQuestion | QuestionDraft>();
    cancelled = output<void>();

    // Computed: is this a new question?
    // New if: question has no id, or no question/questionId provided
    newQuestion = computed(() => {
        const q = this.question();
        if (q !== undefined) {
            return q.id === undefined;
        }
        // Check route data for backward compatibility
        if (!this.isPopup()) {
            const routeData = this.route.snapshot.data['newQuestion'];
            if (routeData !== undefined) {
                return routeData;
            }
        }
        // If no question and no questionId, it's new
        return this.questionId() === undefined;
    });

    // Computed: get questionId from route params or input
    routeQuestionId = computed(() => {
        const routeId = this.route.snapshot.paramMap.get('id');
        if (routeId) {
            return Number(routeId);
        }
        return this.questionId();
    });

    // Current question data (loaded from server, provided as input, or created as new)
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
    private Session = inject(SessionService);

    constructor() {
        // Use effect to reactively load question when inputs change
        // This is important for modal context where inputs are set after component creation
        effect(() => {
            // Track signals to trigger reload when they change
            this.question();
            this.questionId();
            this.newQuestion();
            this.routeQuestionId();

            // Load question when inputs change
            // Component instances are created fresh for routes and modals, so no need to track loaded state
            this.loadQuestion();
            window.addEventListener('beforeunload', (e) => {
                if (this.questionForm.dirty) e.preventDefault();
            });
        });
    }

    canDeactivate(): boolean {
        return !this.questionForm.dirty;
    }

    saveQuestion() {
        const currentQuestionValue = this.currentQuestion();
        if (!currentQuestionValue || !this.questionForm.valid) {
            return;
        }

        const formData = this.readFormData();
        const updatedOptions = this.mapFormOptionsToQuestionOptions(formData, currentQuestionValue);
        const updatedQuestion = this.buildUpdatedQuestion(currentQuestionValue, formData, updatedOptions);

        this.saveToServer(updatedQuestion);
    }

    cancel() {
        // Just initiate navigation/close - guard will check dirty state
        const nextState = this.route.snapshot.queryParamMap.get('nextState');
        if (nextState) {
            this.router.navigate(['/staff', ...nextState.split('/')]);
        } else if (this.isPopup()) {
            // In modal, emit cancelled event
            this.cancelled.emit();
        } else {
            // In route, use browser history back (same as HistoryBackComponent)
            window.history.back();
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

    ngOnDestroy() {
        window.removeEventListener('beforeunload', (e) => {
            if (this.questionForm.dirty) e.preventDefault();
        });
    }

    private readFormData() {
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
        const questionBody = formValue.questionBody || {};

        // For claimChoice, use getRawValue() to include disabled controls (skip option text)
        const questionBodyControl = this.questionForm.get('questionBody');
        const claimChoiceControl =
            questionBodyControl instanceof FormGroup ? questionBodyControl.get('claimChoice') : null;
        const claimChoice =
            claimChoiceControl instanceof FormGroup
                ? (claimChoiceControl.getRawValue() as {
                      options?: Array<{ optionText?: string; score?: number; isSkipOption?: boolean }>;
                  })
                : {};

        return {
            questionBody,
            baseInformation: questionBody.baseInformation || {},
            additionalInfo: questionBody.additionalInfo || {},
            essay: questionBody.essay || {},
            multipleChoice: questionBody.multipleChoice || {},
            weightedMc: questionBody.weightedMc || {},
            claimChoice,
        };
    }

    private mapFormOptionsToQuestionOptions(
        formData: ReturnType<typeof this.readFormData>,
        currentQuestion: ReverseQuestion | QuestionDraft,
    ): MultipleChoiceOption[] {
        const { claimChoice, multipleChoice, weightedMc } = formData;

        if (claimChoice.options?.length) {
            return this.mapClaimChoiceOptions(claimChoice.options, currentQuestion.options);
        }
        if (multipleChoice.options?.length) {
            return this.mapMultipleChoiceOptions(multipleChoice.options, currentQuestion.options);
        }
        if (weightedMc.options?.length) {
            return this.mapWeightedMcOptions(weightedMc.options, currentQuestion.options);
        }

        return currentQuestion.options;
    }

    private mapClaimChoiceOptions(
        formOptions: Array<{ optionText?: string; score?: number; isSkipOption?: boolean }>,
        currentOptions: MultipleChoiceOption[],
    ): MultipleChoiceOption[] {
        return currentOptions.map((opt, index) => {
            const formOption = formOptions[index];
            if (!formOption) return opt;

            const score = formOption.score ?? 0;
            const isSkipOption = formOption.isSkipOption || opt.claimChoiceType === 'SkipOption';
            const claimChoiceType = isSkipOption ? 'SkipOption' : score > 0 ? 'CorrectOption' : 'IncorrectOption';

            return {
                ...opt,
                option: formOption.optionText || '',
                defaultScore: score,
                claimChoiceType,
                correctOption: !isSkipOption && score > 0,
            };
        });
    }

    private mapMultipleChoiceOptions(
        formOptions: Array<{ optionText?: string; correctOption?: boolean }>,
        currentOptions: MultipleChoiceOption[],
    ): MultipleChoiceOption[] {
        return formOptions.map((formOption, index) => {
            const existingOption = currentOptions[index];
            return {
                ...(existingOption || {}),
                option: formOption.optionText || '',
                correctOption: formOption.correctOption === true,
                defaultScore: existingOption?.defaultScore ?? 0,
            };
        });
    }

    private mapWeightedMcOptions(
        formOptions: Array<{ optionText?: string; defaultScore?: number }>,
        currentOptions: MultipleChoiceOption[],
    ): MultipleChoiceOption[] {
        return formOptions.map((formOption, index) => {
            const existingOption = currentOptions[index];
            const score = formOption.defaultScore ?? 0;
            return {
                ...(existingOption || {}),
                option: formOption.optionText || '',
                defaultScore: score,
                correctOption: score > 0,
            };
        });
    }

    private buildUpdatedQuestion(
        currentQuestion: ReverseQuestion | QuestionDraft,
        formData: ReturnType<typeof this.readFormData>,
        updatedOptions: MultipleChoiceOption[],
    ): Question | QuestionDraft {
        const { questionBody, baseInformation, additionalInfo, essay, multipleChoice, weightedMc } = formData;
        const questionType = baseInformation.questionType || currentQuestion.type;

        return {
            ...currentQuestion,
            question: baseInformation.questionText || currentQuestion.question,
            type: questionType,
            defaultMaxScore:
                questionType === 'WeightedMultipleChoiceQuestion'
                    ? undefined
                    : (questionBody.defaultMaxScore ?? currentQuestion.defaultMaxScore),
            defaultAnswerInstructions: additionalInfo.instructions ?? currentQuestion.defaultAnswerInstructions,
            defaultEvaluationCriteria: additionalInfo.evaluationCriteria ?? currentQuestion.defaultEvaluationCriteria,
            questionOwners: this.currentOwners(),
            tags: this.currentTags(),
            options: updatedOptions,
            defaultNegativeScoreAllowed:
                multipleChoice.defaultNegativeScoreAllowed ??
                weightedMc.negativeScore ??
                currentQuestion.defaultNegativeScoreAllowed,
            defaultOptionShufflingOn:
                multipleChoice.defaultOptionShufflingOn ??
                weightedMc.optionShuffling ??
                currentQuestion.defaultOptionShufflingOn,
            defaultExpectedWordCount: essay.defaultExpectedWordCount ?? currentQuestion.defaultExpectedWordCount,
            defaultEvaluationType: essay.defaultEvaluationType ?? currentQuestion.defaultEvaluationType,
        };
    }

    private saveToServer(updatedQuestion: Question | QuestionDraft) {
        const ok = (q: Question) => {
            const reverseQ = { ...q, examSectionQuestions: [] };
            this.questionForm.markAsPristine();
            const nextState =
                this.route.snapshot.queryParamMap.get('nextState') || this.route.snapshot.data['nextState'];
            if (nextState) {
                this.router.navigate(['/staff', ...String(nextState).split('/')]);
            } else if (this.isPopup()) {
                // In modal, emit saved event
                this.saved.emit(reverseQ);
            } else {
                // In route, navigate back to questions list (default behavior)
                this.router.navigate(['/staff/questions']);
            }
        };

        if (this.newQuestion()) {
            this.Question.createQuestion$(updatedQuestion as QuestionDraft).subscribe({
                next: ok,
                error: (error: unknown) => this.toast.error(String(error)),
            });
        } else {
            this.Question.updateQuestion$(updatedQuestion as Question).subscribe({
                next: ok,
                error: (error: unknown) => this.toast.error(String(error)),
            });
        }
    }

    private loadQuestion() {
        const providedQuestion = this.question();
        const questionId = this.routeQuestionId();

        // Priority 1: Use provided question (existing or draft)
        if (providedQuestion !== undefined) {
            // Ensure current user is in question owners for new questions
            const currentUser = this.Session.getUser();
            const questionOwners = providedQuestion.questionOwners || [];
            const owners = questionOwners.filter((o) => o.id !== currentUser.id).concat(currentUser);

            this.currentQuestion.set({
                ...providedQuestion,
                questionOwners: owners,
                examSectionQuestions: providedQuestion.examSectionQuestions || [],
            });
            this.currentOwners.set(owners);
            this.currentTags.set(providedQuestion.tags || []);
        }
        // Priority 2: Load existing question by ID
        else if (questionId && questionId > 0) {
            this.Question.getQuestion(questionId).subscribe({
                next: (question: ReverseQuestion) => {
                    this.currentQuestion.set(question);
                    this.currentOwners.set(question.questionOwners || []);
                    this.currentTags.set(question.tags || []);
                },
                error: (err: unknown) => this.toast.error(String(err)),
            });
        } else {
            // Priority 3: Create new empty question
            const initialOwners = [this.Session.getUser()];
            this.currentQuestion.set({
                id: undefined,
                type: '',
                question: '',
                options: [],
                tags: [],
                questionOwners: initialOwners,
                state: 'DRAFT',
                defaultMaxScore: 0,
                defaultNegativeScoreAllowed: false,
                defaultOptionShufflingOn: false,
                examSectionQuestions: [],
            } as QuestionDraft);
            this.currentOwners.set(initialOwners);
            this.currentTags.set([]);
        }
    }
}
