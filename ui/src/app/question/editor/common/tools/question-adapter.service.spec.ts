// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type {
    ExamSectionQuestion,
    ExamSectionQuestionOption,
    MultipleChoiceOption,
    ReverseQuestion,
} from 'src/app/question/question.model';
import { QuestionAdapterService } from './question-adapter.service';

const option = (id: number, text: string, extra: Partial<MultipleChoiceOption> = {}): MultipleChoiceOption => ({
    id,
    option: text,
    correctOption: false,
    defaultScore: 0,
    ...extra,
});

/** An option of the question in this exam, with its exam-specific score */
const examOption = (id: number, base: MultipleChoiceOption, score: number): ExamSectionQuestionOption => ({
    id,
    score,
    answered: false,
    option: base,
});

const library = (overrides: Partial<ReverseQuestion> = {}) =>
    ({
        id: 1,
        defaultMaxScore: 10,
        defaultExpectedWordCount: 300,
        defaultEvaluationType: 'Points',
        defaultEvaluationCriteria: 'library criteria',
        defaultAnswerInstructions: 'library instructions',
        defaultNegativeScoreAllowed: false,
        defaultOptionShufflingOn: true,
        options: [],
        ...overrides,
    }) as unknown as ReverseQuestion;

describe('QuestionAdapterService', () => {
    const adapter = new QuestionAdapterService();

    describe('showing a question as set in an exam', () => {
        it("should take the exam's own settings over the library's", () => {
            const inExam = {
                maxScore: 4,
                expectedWordCount: 100,
                evaluationType: 'Selection',
                evaluationCriteria: 'exam criteria',
                answerInstructions: 'exam instructions',
                negativeScoreAllowed: true,
                optionShufflingOn: false,
                options: [],
            } as unknown as ExamSectionQuestion;

            expect(adapter.examQuestionToReverseQuestion(inExam, library())).toMatchObject({
                id: 1,
                defaultMaxScore: 4,
                defaultExpectedWordCount: 100,
                defaultEvaluationType: 'Selection',
                defaultEvaluationCriteria: 'exam criteria',
                defaultAnswerInstructions: 'exam instructions',
                defaultNegativeScoreAllowed: true,
                defaultOptionShufflingOn: false,
            });
        });

        it("should fall back on the library's settings where the exam has none", () => {
            const inExam = { options: [] } as unknown as ExamSectionQuestion;
            expect(adapter.examQuestionToReverseQuestion(inExam, library())).toMatchObject({
                defaultMaxScore: 10,
                defaultExpectedWordCount: 300,
                defaultEvaluationCriteria: 'library criteria',
                defaultOptionShufflingOn: true,
            });
        });

        it("should show the options with the exam's scores", () => {
            const a = option(11, 'A', { defaultScore: 1 });
            const inExam = { options: [examOption(21, a, 3)] } as unknown as ExamSectionQuestion;
            expect(adapter.examQuestionToReverseQuestion(inExam, library()).options).toEqual([
                { ...a, defaultScore: 3 },
            ]);
        });
    });

    describe('saving the form for the exam', () => {
        const current = (options: ExamSectionQuestionOption[] = []) => ({ options }) as unknown as ExamSectionQuestion;

        it('should only send what the form has', () => {
            expect(adapter.formValuesToExamQuestionUpdates({}, current(), library())).toEqual({});
            expect(
                adapter.formValuesToExamQuestionUpdates(
                    {
                        questionBody: {
                            defaultMaxScore: 6,
                            essay: { defaultExpectedWordCount: 250, defaultEvaluationType: 'Points' },
                            additionalInfo: { instructions: 'Write clearly', evaluationCriteria: 'Clarity' },
                        },
                    },
                    current(),
                    library(),
                ),
            ).toEqual({
                maxScore: 6,
                expectedWordCount: 250,
                evaluationType: 'Points',
                answerInstructions: 'Write clearly',
                evaluationCriteria: 'Clarity',
            });
        });

        it('should save an emptied score as 0 and an emptied word count as none', () => {
            const updates = adapter.formValuesToExamQuestionUpdates(
                { questionBody: { defaultMaxScore: null, essay: { defaultExpectedWordCount: null } } },
                current(),
                library(),
            );
            expect(updates.maxScore).toBe(0);
            expect(updates.expectedWordCount).toBeUndefined();
        });

        describe('multiple choice', () => {
            it("should match the options by the library option's id, not by their place", () => {
                const a = option(11, 'A', { correctOption: true, defaultScore: 2 });
                const b = option(12, 'B');
                const c = option(13, 'C');
                const stored = [examOption(21, a, 2), examOption(22, b, 0), examOption(23, c, 0)];

                // B was removed in the form, and the rows shifted
                const updates = adapter.formValuesToExamQuestionUpdates(
                    {
                        questionBody: {
                            multipleChoice: {
                                defaultNegativeScoreAllowed: true,
                                defaultOptionShufflingOn: false,
                                options: [
                                    { id: 11, optionText: 'A', correctOption: false },
                                    { id: 13, optionText: 'C changed', correctOption: true },
                                ],
                            },
                        },
                    },
                    current(stored),
                    library(),
                );

                expect(updates.negativeScoreAllowed).toBe(true);
                expect(updates.optionShufflingOn).toBe(false);
                // Multiple choice is scored by the question's max score and correctOption, not option scores
                expect(
                    updates.options!.map((o) => [o.id, o.option.id, o.option.option, o.option.correctOption]),
                ).toEqual([
                    [21, 11, 'A', false],
                    [23, 13, 'C changed', true],
                ]);
            });

            it('should add a new option without ids', () => {
                const updates = adapter.formValuesToExamQuestionUpdates(
                    {
                        questionBody: {
                            multipleChoice: { options: [{ id: null, optionText: 'New', correctOption: true }] },
                        },
                    },
                    current([examOption(21, option(11, 'A'), 0)]),
                    library(),
                );
                const [added] = updates.options!;
                expect(added.id).toBeUndefined();
                expect(added.option).toEqual({ option: 'New', correctOption: true });
            });
        });

        describe('weighted multiple choice', () => {
            it('should score each option as set, and count positive ones as correct', () => {
                const a = option(11, 'A');
                const b = option(12, 'B');
                const updates = adapter.formValuesToExamQuestionUpdates(
                    {
                        questionBody: {
                            weightedMc: {
                                negativeScore: true,
                                optionShuffling: true,
                                options: [
                                    { id: 12, optionText: 'B', defaultScore: -1 },
                                    { id: 11, optionText: 'A', defaultScore: 2.5 },
                                ],
                            },
                        },
                    },
                    current([examOption(21, a, 0), examOption(22, b, 0)]),
                    library(),
                );

                expect(updates.negativeScoreAllowed).toBe(true);
                expect(updates.optionShufflingOn).toBe(true);
                expect(
                    updates.options!.map((o) => [o.id, o.score, o.option.defaultScore, o.option.correctOption]),
                ).toEqual([
                    [22, -1, -1, false],
                    [21, 2.5, 2.5, true],
                ]);
            });
        });

        describe('claim choice', () => {
            const correct = option(11, 'True', {
                claimChoiceType: 'CorrectOption',
                correctOption: true,
                defaultScore: 1,
            });
            const incorrect = option(12, 'False', { claimChoiceType: 'IncorrectOption', defaultScore: -1 });
            const skip = option(13, 'Skip', { claimChoiceType: 'SkipOption' });
            const stored = [examOption(21, correct, 1), examOption(22, incorrect, -1), examOption(23, skip, 0)];

            const save = (options: { optionText?: string; score?: number; isSkipOption?: boolean }[]) =>
                adapter.formValuesToExamQuestionUpdates(
                    { questionBody: { claimChoice: { options } } },
                    current(stored),
                    library({ options: [correct, incorrect, skip] }),
                ).options!;

            it('should set the type of each claim by its score, keeping the skip option a skip', () => {
                const options = save([
                    { optionText: 'True', score: 2 },
                    { optionText: 'False', score: 0 },
                    { optionText: 'Skip', score: 0 },
                ]);
                expect(options.map((o) => [o.id, o.option.claimChoiceType, o.option.correctOption, o.score])).toEqual([
                    [21, 'CorrectOption', true, 2],
                    [22, 'IncorrectOption', false, 0],
                    [23, 'SkipOption', false, 0],
                ]);
            });

            it('should turn a claim whose score drops to zero or below into an incorrect one', () => {
                const [first] = save([
                    { optionText: 'True', score: -0.5 },
                    { optionText: 'False', score: -1 },
                    { optionText: 'Skip', score: 0 },
                ]);
                expect(first.option).toMatchObject({ claimChoiceType: 'IncorrectOption', correctOption: false });
            });
        });
    });
});
