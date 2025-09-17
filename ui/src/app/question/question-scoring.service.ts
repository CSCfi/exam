// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Exam, ExamSection } from 'src/app/exam/exam.model';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';
import { ExamSectionQuestion, Question, QuestionAmounts } from './question.model';

@Injectable({ providedIn: 'root' })
export class QuestionScoringService {
    private httpClient = inject(HttpClient);

    getQuestionAmounts = (exam: Exam): QuestionAmounts => {
        const essays = exam.examSections
            .flatMap((es) => es.sectionQuestions)
            .filter((esq) => esq.question.type === 'EssayQuestion');
        const scores = essays
            .filter((e) => e.evaluationType === 'Selection' && e.essayAnswer)
            .map((e) => e.essayAnswer?.evaluatedScore);
        const accepted = scores.filter((s) => s === 1).length;
        const rejected = scores.filter((s) => s === 0).length;
        return { accepted: accepted, rejected: rejected, hasEssays: essays.length > 0 };
    };

    getEssayQuestionAmountsBySection = (section: ExamSection) => {
        const scores = section.sectionQuestions
            .filter((sq) => sq.question.type === 'EssayQuestion' && sq.evaluationType === 'Selection' && sq.essayAnswer)
            .map((sq) => sq.essayAnswer?.evaluatedScore);
        return {
            accepted: scores.filter((s) => s === 1).length,
            rejected: scores.filter((s) => s === 0).length,
            total: scores.length,
        };
    };

    calculateDefaultMaxPoints = (question: Question) =>
        question.options.filter((o) => o.defaultScore > 0).reduce((a, b) => a + b.defaultScore, 0);

    calculateDefaultMinPoints = (question: Question): number => {
        if (!question.defaultNegativeScoreAllowed) {
            return 0;
        }
        const points = question.options.filter((o) => o.defaultScore < 0).reduce((a, b) => a + b.defaultScore, 0);
        return parseFloat(points.toFixed(2));
    };

    getMinimumOptionScore = (sectionQuestion: ExamSectionQuestion): number => {
        const scores = sectionQuestion.options.map((o) => o.score);
        if (
            sectionQuestion.question.type === 'WeightedMultipleChoiceQuestion' &&
            sectionQuestion.negativeScoreAllowed
        ) {
            return scores.filter((score) => score < 0).reduce((sum, score) => sum + score, 0);
        }
        // For other questionq, return the minimum score but never less than 0
        return Math.max(0, Math.min(...[0, ...scores]));
    };

    getCorrectClaimChoiceOptionDefaultScore = (question: Question): number => {
        if (!question.options) {
            return 0;
        }
        const correctOption = question.options.filter((o) => o.correctOption && o.claimChoiceType === 'CorrectOption');
        return correctOption.length === 1 ? correctOption[0].defaultScore : 0;
    };

    scoreClozeTestAnswer = (sectionQuestion: ExamSectionQuestion): number => {
        if (!sectionQuestion.clozeTestAnswer) {
            return 0;
        }
        if (isNumber(sectionQuestion.forcedScore)) {
            return sectionQuestion.forcedScore;
        }
        const score = sectionQuestion.clozeTestAnswer.score;
        if (!score) return 0;
        const proportion =
            (score.correctAnswers * sectionQuestion.maxScore) / (score.correctAnswers + score.incorrectAnswers);
        return parseFloat(proportion.toFixed(2));
    };

    scoreWeightedMultipleChoiceAnswer = (sectionQuestion: ExamSectionQuestion, ignoreForcedScore: boolean): number => {
        if (isNumber(sectionQuestion.forcedScore) && !ignoreForcedScore) {
            return sectionQuestion.forcedScore;
        }
        const score = sectionQuestion.options.filter((o) => o.answered).reduce((a, b) => a + b.score, 0);
        const minScore = sectionQuestion.negativeScoreAllowed ? score : 0;
        return Math.max(minScore, score);
    };

    // For non-weighted mcq
    scoreMultipleChoiceAnswer = (sectionQuestion: ExamSectionQuestion, ignoreForcedScore: boolean): number => {
        if (isNumber(sectionQuestion.forcedScore) && !ignoreForcedScore) {
            return sectionQuestion.forcedScore;
        }
        const answered = sectionQuestion.options.filter((o) => o.answered);
        if (answered.length === 0) {
            // No answer
            return 0;
        }
        if (answered.length !== 1) {
            console.error('multiple options selected for a MultiChoice answer!');
        }
        return answered[0].option.correctOption ? sectionQuestion.maxScore : 0;
    };

    scoreClaimChoiceAnswer = (sectionQuestion: ExamSectionQuestion, ignoreForcedScore: boolean): number => {
        if (isNumber(sectionQuestion.forcedScore) && !ignoreForcedScore) {
            return sectionQuestion.forcedScore;
        }
        const selected = sectionQuestion.options.filter((o) => o.answered);

        // Use the score from the skip option if no option was chosen
        const skipOption = sectionQuestion.options.filter((o) => o.option.claimChoiceType === 'SkipOption');
        const skipScore = skipOption.length === 1 ? skipOption[0].score : 0;

        if (selected.length === 0) {
            return skipScore;
        }
        if (selected.length !== 1) {
            console.error('multiple options selected for a ClaimChoice answer!');
        }
        if (selected[0].score && isNumber(selected[0].score)) {
            return selected[0].score;
        }
        return 0;
    };

    calculateAnswerScore = (sq: ExamSectionQuestion) => {
        switch (sq.question.type) {
            case 'MultipleChoiceQuestion':
                return { score: this.scoreMultipleChoiceAnswer(sq, false), rejected: false, approved: false };
            case 'WeightedMultipleChoiceQuestion':
                return { score: this.scoreWeightedMultipleChoiceAnswer(sq, false), rejected: false, approved: false };
            case 'ClozeTestQuestion':
                return { score: this.scoreClozeTestAnswer(sq), rejected: false, approved: false };
            case 'EssayQuestion':
                if (sq.essayAnswer && sq.essayAnswer.evaluatedScore && sq.evaluationType === 'Points') {
                    return { score: sq.essayAnswer.evaluatedScore, rejected: false, approved: false };
                } else if (sq.essayAnswer && sq.essayAnswer.evaluatedScore && sq.evaluationType === 'Selection') {
                    const score = sq.essayAnswer.evaluatedScore;
                    return { score: score, rejected: score === 0, approved: score === 1 };
                }
                return { score: 0, rejected: false, approved: false };
            case 'ClaimChoiceQuestion':
                return { score: this.scoreClaimChoiceAnswer(sq, false), rejected: false, approved: false };
            default:
                throw Error('unknown question type');
        }
    };

    calculateWeightedMaxPoints = (question: ExamSectionQuestion): number => {
        const points = question.options.filter((o) => o.score > 0).reduce((a, b) => a + b.score, 0);
        return parseFloat(points.toFixed(2));
    };

    calculateWeightedMinPoints = (question: ExamSectionQuestion): number => {
        if (!question.negativeScoreAllowed) {
            return 0;
        }
        const points = question.options.filter((o) => o.score < 0).reduce((a, b) => a + b.score, 0);
        return parseFloat(points.toFixed(2));
    };

    getCorrectClaimChoiceOptionScore = (sectionQuestion: ExamSectionQuestion): number => {
        if (!sectionQuestion.options) {
            return 0;
        }
        const optionScores = sectionQuestion.options.map((o) => o.score);
        return Math.max(0, ...optionScores);
    };

    calculateMaxScore = (question: ExamSectionQuestion) => {
        const evaluationType = question.evaluationType;
        const type = question.question.type;
        if (evaluationType === 'Points' || type === 'MultipleChoiceQuestion' || type === 'ClozeTestQuestion') {
            return question.maxScore;
        }
        if (type === 'WeightedMultipleChoiceQuestion') {
            return this.calculateWeightedMaxPoints(question);
        }
        if (type === 'ClaimChoiceQuestion') {
            return this.getCorrectClaimChoiceOptionScore(question);
        }
        return 0;
    };
}
