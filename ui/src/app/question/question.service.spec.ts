// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import type {
    ExamSectionQuestion,
    ExamSectionQuestionOption,
    MultipleChoiceOption,
    Question,
    QuestionDraft,
} from 'src/app/question/question.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { FileService } from 'src/app/shared/file/file.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { QuestionService } from './question.service';

describe('QuestionService', () => {
    let service: QuestionService;
    let http: HttpTestingController;
    const toast = { info: vi.fn(), error: vi.fn() };

    const essay = {
        id: 5,
        type: 'EssayQuestion',
        question: '<p>Explain</p>',
        defaultMaxScore: 4,
        defaultExpectedWordCount: 300,
        defaultEvaluationType: 'Points',
        questionOwners: [],
        tags: [],
        options: [],
        shared: false,
        // Not sent
        examSectionQuestions: [{ id: 1 }],
    } as unknown as Question;

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
                { provide: FileService, useValue: { upload$: vi.fn() } },
                { provide: AttachmentService, useValue: { eraseQuestionAttachment$: vi.fn() } },
            ],
        });
        service = TestBed.inject(QuestionService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('should map route names to question types', () => {
        expect(['essay', 'multichoice', 'weighted', 'cloze', 'claim'].map(service.getQuestionType)).toEqual([
            'EssayQuestion',
            'MultipleChoiceQuestion',
            'WeightedMultipleChoiceQuestion',
            'ClozeTestQuestion',
            'ClaimChoiceQuestion',
        ]);
        expect(() => service.getQuestionType('other')).toThrow();
    });

    it('should create a question with only the editable fields', async () => {
        const draft = { ...essay, id: undefined } as unknown as QuestionDraft;
        const done = firstValueFrom(service.createQuestion$(draft));

        const req = http.expectOne('/app/questions');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toMatchObject({ type: 'EssayQuestion', defaultExpectedWordCount: 300 });
        expect(req.request.body.id).toBeUndefined();
        expect(req.request.body.examSectionQuestions).toBeUndefined();
        req.flush({ id: 6 });

        expect((await done).id).toBe(6);
        expect(toast.info).toHaveBeenCalledWith('i18n_question_added');
    });

    it('should update a question by id and leave out essay fields for other types', async () => {
        const mc = { ...essay, type: 'MultipleChoiceQuestion', options: [{ id: 1 }] } as unknown as Question;

        const done = firstValueFrom(service.updateQuestion$(mc));
        const req = http.expectOne('/app/questions/5');
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toMatchObject({ id: 5, options: [{ id: 1 }] });
        expect(req.request.body.defaultExpectedWordCount).toBeUndefined();
        req.flush(mc);
        await done;

        expect(toast.info).toHaveBeenCalledWith('i18n_question_saved');
    });

    it('should save a question used in several exams with the exam-specific settings', async () => {
        const sq = {
            id: 9,
            maxScore: 3,
            expectedWordCount: 100,
            evaluationType: 'Selection',
            options: [],
        } as unknown as ExamSectionQuestion;

        const done = firstValueFrom(service.updateDistributedExamQuestion$(essay, sq, 7, 2));
        const req = http.expectOne('/app/exams/7/sections/2/questions/9/distributed');
        expect(req.request.body).toMatchObject({
            id: 9,
            maxScore: 3,
            expectedWordCount: 100,
            evaluationType: 'Selection',
            question: essay,
        });
        req.flush({ id: 9, question: { id: 5 } });

        expect((await done).question).toMatchObject({ id: 5, question: '<p>Explain</p>' });
    });

    it('should mark exactly one option correct', () => {
        const options = [{ correctOption: true }, { correctOption: false }, {}] as MultipleChoiceOption[];

        service.toggleCorrectOption(options[2], options);

        expect(options.map((o) => o.correctOption)).toEqual([false, false, true]);
    });

    describe('claim choice', () => {
        const option = (claimChoiceType: string, defaultScore: number, text = 'x') =>
            ({ claimChoiceType, defaultScore, option: text }) as MultipleChoiceOption;

        it('should accept a correct, an incorrect and a skip option', () => {
            expect(
                service.getInvalidClaimOptionTypes([
                    option('CorrectOption', 1),
                    option('IncorrectOption', -1),
                    option('SkipOption', 0),
                ]),
            ).toEqual([]);
        });

        it('should name the options that are missing, unscored or empty', () => {
            expect(
                service.getInvalidClaimOptionTypes([
                    option('CorrectOption', 0),
                    option('IncorrectOption', 1),
                    option('SkipOption', 0, ''),
                ]),
            ).toEqual(['CorrectOption', 'IncorrectOption', 'SkipOption']);
        });

        it('should derive the type of an exam option from its score', () => {
            const examOption = (score: number, claimChoiceType = 'CorrectOption') =>
                ({ score, option: { claimChoiceType, option: 'x' } }) as unknown as ExamSectionQuestionOption;

            expect(service.determineClaimOptionTypeForExamQuestionOption(examOption(2))).toBe('CorrectOption');
            expect(service.determineClaimOptionTypeForExamQuestionOption(examOption(0))).toBe('IncorrectOption');
            expect(service.determineClaimOptionTypeForExamQuestionOption(examOption(0, 'SkipOption'))).toBe(
                'SkipOption',
            );
            expect(service.getInvalidDistributedClaimOptionTypes([examOption(2), examOption(-1)])).toEqual([
                'SkipOption',
            ]);
        });

        it('should give labels and classes per type', () => {
            expect(service.getOptionTypeTranslation('SkipOption')).toBe('i18n_question_claim_skip');
            expect(service.determineClaimChoiceOptionClass('IncorrectOption')).toBe('claim-choice-incorrect-answer');
            expect(service.determineOptionDescriptionTranslation('CorrectOption')).toBe(
                'i18n_claim_choice_correct_option_description',
            );
            expect(service.getOptionTypeTranslation('other')).toBe('');
        });
    });

    it('should add an owner to several questions', () => {
        service.addOwnerForQuestions$(3, [1, 2]).subscribe();

        const req = http.expectOne('/app/questions/owner/3');
        expect(req.request.body).toEqual({ uid: 3, questionIds: '1,2' });
        req.flush(null);
    });
});
