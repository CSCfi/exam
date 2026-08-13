// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';
import type {
    ExamSectionQuestion,
    ExamSectionQuestionOption,
    MultipleChoiceOption,
    ReverseQuestion,
} from 'src/app/question/question.model';

/**
 * Adapter service to convert between ExamSectionQuestion and ReverseQuestion
 * This allows QuestionBodyComponent to work with both data models
 */
@Injectable({ providedIn: 'root' })
export class QuestionAdapterService {
    /**
     * Convert ExamSectionQuestion to a ReverseQuestion-like structure for form binding
     * Creates a view model that QuestionBodyComponent can work with
     */
    examQuestionToReverseQuestion(examQuestion: ExamSectionQuestion, baseQuestion: ReverseQuestion): ReverseQuestion {
        // Create a merged view that uses exam-specific overrides where available
        return {
            ...baseQuestion,
            // Override with exam-specific values
            defaultMaxScore: examQuestion.maxScore ?? baseQuestion.defaultMaxScore,
            defaultExpectedWordCount: examQuestion.expectedWordCount ?? baseQuestion.defaultExpectedWordCount,
            defaultEvaluationType: examQuestion.evaluationType ?? baseQuestion.defaultEvaluationType,
            defaultEvaluationCriteria: examQuestion.evaluationCriteria ?? baseQuestion.defaultEvaluationCriteria,
            defaultAnswerInstructions: examQuestion.answerInstructions ?? baseQuestion.defaultAnswerInstructions,
            // Convert ExamSectionQuestionOption[] to MultipleChoiceOption[]
            options: this.convertOptions(examQuestion.options),
            // Exam-specific settings
            defaultNegativeScoreAllowed: examQuestion.negativeScoreAllowed ?? baseQuestion.defaultNegativeScoreAllowed,
            defaultOptionShufflingOn: examQuestion.optionShufflingOn ?? baseQuestion.defaultOptionShufflingOn,
        };
    }

    /**
     * Convert form values from QuestionBodyComponent back to ExamSectionQuestion updates
     * Handles the nested form structure from QuestionBodyComponent
     */
    formValuesToExamQuestionUpdates(
        formValues: {
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
        },
        currentExamQuestion: ExamSectionQuestion,
        currentBaseQuestion: ReverseQuestion,
    ): Partial<ExamSectionQuestion> {
        const updates: Partial<ExamSectionQuestion> = {};
        const questionBody = formValues.questionBody || {};

        // Map defaultMaxScore to maxScore
        if (questionBody.defaultMaxScore !== undefined) {
            updates.maxScore = questionBody.defaultMaxScore ?? 0;
        }

        // Map essay fields
        if (questionBody.essay) {
            if (questionBody.essay.defaultExpectedWordCount !== undefined) {
                updates.expectedWordCount = questionBody.essay.defaultExpectedWordCount ?? undefined;
            }
            if (questionBody.essay.defaultEvaluationType !== undefined) {
                updates.evaluationType = questionBody.essay.defaultEvaluationType;
            }
        }

        // Map additionalInfo fields
        if (questionBody.additionalInfo) {
            if (questionBody.additionalInfo.instructions !== undefined) {
                updates.answerInstructions = questionBody.additionalInfo.instructions;
            }
            if (questionBody.additionalInfo.evaluationCriteria !== undefined) {
                updates.evaluationCriteria = questionBody.additionalInfo.evaluationCriteria;
            }
        }

        // Map multipleChoice fields
        if (questionBody.multipleChoice) {
            if (questionBody.multipleChoice.defaultNegativeScoreAllowed !== undefined) {
                updates.negativeScoreAllowed = questionBody.multipleChoice.defaultNegativeScoreAllowed;
            }
            if (questionBody.multipleChoice.defaultOptionShufflingOn !== undefined) {
                updates.optionShufflingOn = questionBody.multipleChoice.defaultOptionShufflingOn;
            }
            // Convert options
            if (questionBody.multipleChoice.options) {
                updates.options = this.convertMultipleChoiceOptionsToExamOptions(
                    questionBody.multipleChoice.options,
                    currentExamQuestion.options,
                );
            }
        }

        // Map weightedMc fields
        if (questionBody.weightedMc) {
            if (questionBody.weightedMc.negativeScore !== undefined) {
                updates.negativeScoreAllowed = questionBody.weightedMc.negativeScore;
            }
            if (questionBody.weightedMc.optionShuffling !== undefined) {
                updates.optionShufflingOn = questionBody.weightedMc.optionShuffling;
            }
            // Convert options
            if (questionBody.weightedMc.options) {
                updates.options = this.convertWeightedMcOptionsToExamOptions(
                    questionBody.weightedMc.options,
                    currentExamQuestion.options,
                );
            }
        }

        // Map claimChoice options (use getRawValue for disabled controls)
        if (questionBody.claimChoice?.options) {
            updates.options = this.convertClaimChoiceOptionsToExamOptions(
                questionBody.claimChoice.options,
                currentExamQuestion.options,
                currentBaseQuestion.options,
            );
        }

        return updates;
    }

    /**
     * Convert MultipleChoice form options to ExamSectionQuestionOption[]
     */
    private convertMultipleChoiceOptionsToExamOptions(
        formOptions: Array<{ optionText?: string; correctOption?: boolean }>,
        currentOptions: ExamSectionQuestionOption[],
    ): ExamSectionQuestionOption[] {
        return formOptions.map((formOpt, index) => {
            const currentOpt = currentOptions[index];
            const baseOption = currentOpt?.option;
            return {
                ...(currentOpt || {}),
                option: {
                    ...(baseOption || {}),
                    option: formOpt.optionText || '',
                    correctOption: formOpt.correctOption === true,
                },
                score: formOpt.correctOption ? (baseOption?.defaultScore ?? 1) : 0,
            };
        });
    }

    /**
     * Convert WeightedMultipleChoice form options to ExamSectionQuestionOption[]
     */
    private convertWeightedMcOptionsToExamOptions(
        formOptions: Array<{ optionText?: string; defaultScore?: number }>,
        currentOptions: ExamSectionQuestionOption[],
    ): ExamSectionQuestionOption[] {
        return formOptions.map((formOpt, index) => {
            const currentOpt = currentOptions[index];
            const baseOption = currentOpt?.option;
            return {
                ...(currentOpt || {}),
                option: {
                    ...(baseOption || {}),
                    option: formOpt.optionText || '',
                    defaultScore: formOpt.defaultScore ?? 0,
                    correctOption: (formOpt.defaultScore ?? 0) > 0,
                },
                score: formOpt.defaultScore ?? 0,
            };
        });
    }

    /**
     * Convert ClaimChoice form options to ExamSectionQuestionOption[]
     */
    private convertClaimChoiceOptionsToExamOptions(
        formOptions: Array<{ optionText?: string; score?: number; isSkipOption?: boolean }>,
        currentOptions: ExamSectionQuestionOption[],
        baseQuestionOptions: MultipleChoiceOption[],
    ): ExamSectionQuestionOption[] {
        return formOptions.map((formOpt, index) => {
            const currentOpt = currentOptions[index];
            const baseOption = baseQuestionOptions[index] || currentOpt?.option;
            const score = formOpt.score ?? 0;
            const isSkipOption = formOpt.isSkipOption || baseOption?.claimChoiceType === 'SkipOption';

            // Determine claimChoiceType based on score
            let claimChoiceType = baseOption?.claimChoiceType;
            let correctOption = baseOption?.correctOption ?? false;
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
                ...(currentOpt || {}),
                option: {
                    ...(baseOption || {}),
                    option: formOpt.optionText || '',
                    defaultScore: score,
                    claimChoiceType,
                    correctOption,
                },
                score: score,
            };
        });
    }

    /**
     * Convert ExamSectionQuestionOption[] to MultipleChoiceOption[]
     */
    private convertOptions(examOptions: ExamSectionQuestionOption[]): MultipleChoiceOption[] {
        return examOptions.map((eqo) => ({
            ...eqo.option,
            // Preserve exam-specific score if different from default
            defaultScore: eqo.score ?? eqo.option?.defaultScore ?? 0,
        }));
    }

    /**
     * Convert MultipleChoiceOption[] back to ExamSectionQuestionOption[]
     */
    private convertOptionsBack(
        formOptions: MultipleChoiceOption[],
        currentOptions: ExamSectionQuestionOption[],
    ): ExamSectionQuestionOption[] {
        return formOptions.map((formOpt, index) => {
            const currentOpt = currentOptions[index];
            return {
                ...(currentOpt || {}),
                option: {
                    ...(currentOpt?.option || {}),
                    ...formOpt,
                },
                score: formOpt.defaultScore ?? currentOpt?.score ?? 0,
            };
        });
    }
}
