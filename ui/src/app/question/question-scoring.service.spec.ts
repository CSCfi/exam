// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { TestBed } from '@angular/core/testing';
import type { Exam, ExamSection } from 'src/app/exam/exam.model';
import { QuestionScoringService } from './question-scoring.service';
import type {
    ClozeTestAnswer,
    ExamSectionQuestion,
    ExamSectionQuestionOption,
    MultipleChoiceOption,
} from './question.model';

function makeOption(
    score: number,
    answered: boolean,
    correctOption = false,
    claimChoiceType?: string,
): ExamSectionQuestionOption {
    return { score, answered, option: { option: 'opt', correctOption, defaultScore: score, claimChoiceType } };
}

const baseQuestion = {
    id: 1,
    question: '',
    type: 'MultipleChoiceQuestion',
    options: [],
    tags: [],
    questionOwners: [],
    state: 'PUBLISHED',
    defaultNegativeScoreAllowed: false,
    defaultOptionShufflingOn: false,
};

function makeESQ(overrides: Partial<ExamSectionQuestion> = {}): ExamSectionQuestion {
    return {
        id: 1,
        question: { ...baseQuestion },
        forcedScore: null,
        maxScore: 10,
        options: [],
        answerInstructions: '',
        evaluationCriteria: '',
        negativeScoreAllowed: false,
        optionShufflingOn: false,
        sequenceNumber: 0,
        ...overrides,
    };
}

function makeClozeAnswer(correctAnswers: number, incorrectAnswers: number): ClozeTestAnswer {
    return {
        id: 1,
        score: { correctAnswers, incorrectAnswers },
        maxScore: 10,
        answer: '',
        objectVersion: 0,
        question: '',
    };
}

describe('QuestionScoringService', () => {
    let service: QuestionScoringService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(QuestionScoringService);
    });

    describe('calculateDefaultMaxPoints', () => {
        it('should sum only positive defaultScores', () => {
            const options: MultipleChoiceOption[] = [
                { option: 'A', correctOption: true, defaultScore: 5 },
                { option: 'B', correctOption: false, defaultScore: -2 },
                { option: 'C', correctOption: false, defaultScore: 3 },
            ];
            expect(service.calculateDefaultMaxPoints(options)).toBe(8);
        });

        it('should return 0 when there are no positive scores', () => {
            expect(service.calculateDefaultMaxPoints([{ option: 'A', correctOption: false, defaultScore: -3 }])).toBe(
                0,
            );
        });

        it('should return 0 for empty options', () => {
            expect(service.calculateDefaultMaxPoints([])).toBe(0);
        });
    });

    describe('calculateDefaultMinPoints', () => {
        it('should return 0 when allowNegative is false regardless of negative scores', () => {
            const options: MultipleChoiceOption[] = [{ option: 'A', correctOption: false, defaultScore: -5 }];
            expect(service.calculateDefaultMinPoints(options, false)).toBe(0);
        });

        it('should sum only negative defaultScores when allowNegative is true', () => {
            const options: MultipleChoiceOption[] = [
                { option: 'A', correctOption: true, defaultScore: 5 },
                { option: 'B', correctOption: false, defaultScore: -2 },
                { option: 'C', correctOption: false, defaultScore: -1.5 },
            ];
            expect(service.calculateDefaultMinPoints(options, true)).toBe(-3.5);
        });

        it('should return 0 when allowNegative is true but there are no negative scores', () => {
            const options: MultipleChoiceOption[] = [{ option: 'A', correctOption: true, defaultScore: 5 }];
            expect(service.calculateDefaultMinPoints(options, true)).toBe(0);
        });
    });

    describe('getMinimumOptionScore', () => {
        it('should sum all negative option scores for WeightedMultipleChoiceQuestion with negativeScoreAllowed', () => {
            const esq = makeESQ({
                question: { ...baseQuestion, type: 'WeightedMultipleChoiceQuestion' },
                negativeScoreAllowed: true,
                options: [makeOption(-3, false), makeOption(-2, false), makeOption(5, false)],
            });
            expect(service.getMinimumOptionScore(esq)).toBe(-5);
        });

        it('should return 0 for WeightedMultipleChoiceQuestion when negativeScoreAllowed is false', () => {
            const esq = makeESQ({
                question: { ...baseQuestion, type: 'WeightedMultipleChoiceQuestion' },
                negativeScoreAllowed: false,
                options: [makeOption(-3, false), makeOption(5, false)],
            });
            expect(service.getMinimumOptionScore(esq)).toBe(0);
        });

        it('should return 0 for non-weighted question when all scores are positive', () => {
            const esq = makeESQ({ options: [makeOption(3, false), makeOption(5, false)] });
            expect(service.getMinimumOptionScore(esq)).toBe(0);
        });

        it('should return 0 for non-weighted question even when some scores are negative', () => {
            const esq = makeESQ({ options: [makeOption(-2, false), makeOption(5, false)] });
            expect(service.getMinimumOptionScore(esq)).toBe(0);
        });
    });

    describe('scoreClozeTestAnswer', () => {
        it('should return 0 when there is no clozeTestAnswer', () => {
            expect(service.scoreClozeTestAnswer(makeESQ())).toBe(0);
        });

        it('should return forcedScore when forcedScore is set', () => {
            const esq = makeESQ({ forcedScore: 7, clozeTestAnswer: makeClozeAnswer(3, 1) });
            expect(service.scoreClozeTestAnswer(esq)).toBe(7);
        });

        it('should return 0 when clozeTestAnswer has no score object', () => {
            const esq = makeESQ({
                clozeTestAnswer: { id: 1, score: undefined, maxScore: 10, answer: '', objectVersion: 0, question: '' },
            });
            expect(service.scoreClozeTestAnswer(esq)).toBe(0);
        });

        it('should calculate proportion of correct answers', () => {
            // 2 correct, 3 incorrect, maxScore 10 → 2 * 10 / 5 = 4.00
            const esq = makeESQ({ maxScore: 10, clozeTestAnswer: makeClozeAnswer(2, 3) });
            expect(service.scoreClozeTestAnswer(esq)).toBe(4);
        });

        it('should round floating-point proportion to 2 decimal places', () => {
            // 1 correct, 2 incorrect, maxScore 10 → 10/3 = 3.333... → 3.33
            const esq = makeESQ({ maxScore: 10, clozeTestAnswer: makeClozeAnswer(1, 2) });
            expect(service.scoreClozeTestAnswer(esq)).toBe(3.33);
        });
    });

    describe('scoreWeightedMultipleChoiceAnswer', () => {
        it('should return forcedScore when set and ignoreForcedScore is false', () => {
            const esq = makeESQ({ forcedScore: 5, options: [makeOption(3, true)] });
            expect(service.scoreWeightedMultipleChoiceAnswer(esq, false)).toBe(5);
        });

        it('should ignore forcedScore when ignoreForcedScore is true', () => {
            const esq = makeESQ({ forcedScore: 5, options: [makeOption(3, true)] });
            expect(service.scoreWeightedMultipleChoiceAnswer(esq, true)).toBe(3);
        });

        it('should sum scores of all answered options', () => {
            const esq = makeESQ({ options: [makeOption(3, true), makeOption(2, true), makeOption(-1, false)] });
            expect(service.scoreWeightedMultipleChoiceAnswer(esq, false)).toBe(5);
        });

        it('should return 0 for a negative sum when negativeScoreAllowed is false', () => {
            const esq = makeESQ({
                negativeScoreAllowed: false,
                options: [makeOption(-3, true), makeOption(-2, true)],
            });
            expect(service.scoreWeightedMultipleChoiceAnswer(esq, false)).toBe(0);
        });

        it('should return the negative sum when negativeScoreAllowed is true', () => {
            const esq = makeESQ({
                negativeScoreAllowed: true,
                options: [makeOption(-3, true), makeOption(-2, true)],
            });
            expect(service.scoreWeightedMultipleChoiceAnswer(esq, false)).toBe(-5);
        });
    });

    describe('scoreMultipleChoiceAnswer', () => {
        it('should return 0 when no option is answered', () => {
            const esq = makeESQ({ options: [makeOption(5, false)] });
            expect(service.scoreMultipleChoiceAnswer(esq, false)).toBe(0);
        });

        it('should return maxScore when the answered option is correct', () => {
            const esq = makeESQ({ maxScore: 10, options: [makeOption(5, true, true)] });
            expect(service.scoreMultipleChoiceAnswer(esq, false)).toBe(10);
        });

        it('should return 0 when the answered option is incorrect', () => {
            const esq = makeESQ({ maxScore: 10, options: [makeOption(5, true, false)] });
            expect(service.scoreMultipleChoiceAnswer(esq, false)).toBe(0);
        });

        it('should return forcedScore when set and ignoreForcedScore is false', () => {
            const esq = makeESQ({ forcedScore: 7, options: [makeOption(5, true, false)] });
            expect(service.scoreMultipleChoiceAnswer(esq, false)).toBe(7);
        });

        it('should ignore forcedScore when ignoreForcedScore is true', () => {
            const esq = makeESQ({ forcedScore: 7, maxScore: 10, options: [makeOption(5, true, true)] });
            expect(service.scoreMultipleChoiceAnswer(esq, true)).toBe(10);
        });
    });

    describe('scoreClaimChoiceAnswer', () => {
        it('should return the skip option score when no option is selected', () => {
            const esq = makeESQ({
                options: [
                    {
                        score: 2,
                        answered: false,
                        option: {
                            option: 'skip',
                            correctOption: false,
                            defaultScore: 2,
                            claimChoiceType: 'SkipOption',
                        },
                    },
                    makeOption(5, false, true, 'CorrectOption'),
                ],
            });
            expect(service.scoreClaimChoiceAnswer(esq, false)).toBe(2);
        });

        it('should return 0 when no option is selected and there is no skip option', () => {
            const esq = makeESQ({ options: [makeOption(5, false, true, 'CorrectOption')] });
            expect(service.scoreClaimChoiceAnswer(esq, false)).toBe(0);
        });

        it('should return the score of the selected option', () => {
            const esq = makeESQ({
                options: [
                    {
                        score: 3,
                        answered: true,
                        option: {
                            option: 'correct',
                            correctOption: true,
                            defaultScore: 3,
                            claimChoiceType: 'CorrectOption',
                        },
                    },
                    {
                        score: -1,
                        answered: false,
                        option: {
                            option: 'skip',
                            correctOption: false,
                            defaultScore: 0,
                            claimChoiceType: 'SkipOption',
                        },
                    },
                ],
            });
            expect(service.scoreClaimChoiceAnswer(esq, false)).toBe(3);
        });

        it('should return forcedScore when set and ignoreForcedScore is false', () => {
            const esq = makeESQ({
                forcedScore: 4,
                options: [
                    { score: 3, answered: true, option: { option: 'correct', correctOption: true, defaultScore: 3 } },
                ],
            });
            expect(service.scoreClaimChoiceAnswer(esq, false)).toBe(4);
        });
    });

    describe('calculateAnswerScore', () => {
        it('should dispatch MultipleChoiceQuestion to scoreMultipleChoiceAnswer', () => {
            const esq = makeESQ({ options: [makeOption(5, true, true)] });
            const result = service.calculateAnswerScore(esq);
            expect(result.score).toBe(10);
            expect(result.rejected).toBe(false);
            expect(result.approved).toBe(false);
        });

        it('should dispatch WeightedMultipleChoiceQuestion to scoreWeightedMultipleChoiceAnswer', () => {
            const esq = makeESQ({
                question: { ...baseQuestion, type: 'WeightedMultipleChoiceQuestion' },
                options: [makeOption(4, true)],
            });
            expect(service.calculateAnswerScore(esq).score).toBe(4);
        });

        it('should dispatch ClozeTestQuestion to scoreClozeTestAnswer', () => {
            const esq = makeESQ({
                question: { ...baseQuestion, type: 'ClozeTestQuestion' },
                maxScore: 10,
                clozeTestAnswer: makeClozeAnswer(5, 5),
            });
            expect(service.calculateAnswerScore(esq).score).toBe(5);
        });

        it('should return evaluatedScore for EssayQuestion with Points evaluationType', () => {
            const esq = makeESQ({
                question: { ...baseQuestion, type: 'EssayQuestion' },
                evaluationType: 'Points',
                essayAnswer: { answer: 'text', evaluatedScore: 8 },
            });
            const result = service.calculateAnswerScore(esq);
            expect(result.score).toBe(8);
            expect(result.rejected).toBe(false);
            expect(result.approved).toBe(false);
        });

        it('should mark approved for EssayQuestion with Selection and evaluatedScore 1', () => {
            const esq = makeESQ({
                question: { ...baseQuestion, type: 'EssayQuestion' },
                evaluationType: 'Selection',
                essayAnswer: { answer: 'text', evaluatedScore: 1 },
            });
            const result = service.calculateAnswerScore(esq);
            expect(result.approved).toBe(true);
            expect(result.rejected).toBe(false);
        });

        it('should return score 0 with no flags for EssayQuestion with Selection and evaluatedScore 0 (falsy guard)', () => {
            // evaluatedScore: 0 is falsy, so the Selection branch is not entered and the default branch applies
            const esq = makeESQ({
                question: { ...baseQuestion, type: 'EssayQuestion' },
                evaluationType: 'Selection',
                essayAnswer: { answer: 'text', evaluatedScore: 0 },
            });
            const result = service.calculateAnswerScore(esq);
            expect(result.score).toBe(0);
            expect(result.rejected).toBe(false);
            expect(result.approved).toBe(false);
        });

        it('should dispatch ClaimChoiceQuestion to scoreClaimChoiceAnswer', () => {
            const esq = makeESQ({
                question: { ...baseQuestion, type: 'ClaimChoiceQuestion' },
                options: [
                    {
                        score: 3,
                        answered: true,
                        option: {
                            option: 'correct',
                            correctOption: true,
                            defaultScore: 3,
                            claimChoiceType: 'CorrectOption',
                        },
                    },
                ],
            });
            expect(service.calculateAnswerScore(esq).score).toBe(3);
        });

        it('should throw for an unknown question type', () => {
            const esq = makeESQ({ question: { ...baseQuestion, type: 'UnknownType' } });
            expect(() => service.calculateAnswerScore(esq)).toThrow('unknown question type');
        });
    });

    describe('getQuestionAmounts', () => {
        it('should count accepted and rejected essays from evaluatedScore', () => {
            const exam = {
                examSections: [
                    {
                        sectionQuestions: [
                            {
                                question: { type: 'EssayQuestion' },
                                evaluationType: 'Selection',
                                essayAnswer: { answer: '', evaluatedScore: 1 },
                            },
                            {
                                question: { type: 'EssayQuestion' },
                                evaluationType: 'Selection',
                                essayAnswer: { answer: '', evaluatedScore: 0 },
                            },
                            {
                                question: { type: 'EssayQuestion' },
                                evaluationType: 'Selection',
                                essayAnswer: { answer: '', evaluatedScore: 1 },
                            },
                        ],
                    },
                ],
            } as unknown as Exam;
            const amounts = service.getQuestionAmounts(exam);
            expect(amounts.accepted).toBe(2);
            expect(amounts.rejected).toBe(1);
            expect(amounts.hasEssays).toBe(true);
        });

        it('should return hasEssays false when there are no essay questions', () => {
            const exam = {
                examSections: [{ sectionQuestions: [{ question: { type: 'MultipleChoiceQuestion' }, options: [] }] }],
            } as unknown as Exam;
            expect(service.getQuestionAmounts(exam).hasEssays).toBe(false);
        });

        it('should not count essays without essayAnswer', () => {
            const exam = {
                examSections: [
                    {
                        sectionQuestions: [
                            {
                                question: { type: 'EssayQuestion' },
                                evaluationType: 'Selection',
                                essayAnswer: undefined,
                            },
                        ],
                    },
                ],
            } as unknown as Exam;
            const amounts = service.getQuestionAmounts(exam);
            expect(amounts.accepted).toBe(0);
            expect(amounts.rejected).toBe(0);
            expect(amounts.hasEssays).toBe(true);
        });
    });

    describe('getEssayQuestionAmountsBySection', () => {
        it('should count accepted, rejected and total for a section', () => {
            const section = {
                sectionQuestions: [
                    {
                        question: { type: 'EssayQuestion' },
                        evaluationType: 'Selection',
                        essayAnswer: { evaluatedScore: 1 },
                    },
                    {
                        question: { type: 'EssayQuestion' },
                        evaluationType: 'Selection',
                        essayAnswer: { evaluatedScore: 0 },
                    },
                    {
                        question: { type: 'EssayQuestion' },
                        evaluationType: 'Selection',
                        essayAnswer: { evaluatedScore: 1 },
                    },
                ],
            } as unknown as ExamSection;
            const result = service.getEssayQuestionAmountsBySection(section);
            expect(result.accepted).toBe(2);
            expect(result.rejected).toBe(1);
            expect(result.total).toBe(3);
        });
    });
});
