// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import type { ClozeTestAnswer, EssayAnswer } from 'src/app/question/question.model';
import { vi } from 'vitest';
import type { Examination, ExaminationQuestion, ExaminationSection } from './examination.model';
import { ExaminationService } from './examination.service';

function makeQuestion(
    type: 'EssayQuestion' | 'ClozeTestQuestion' | 'MultipleChoiceQuestion',
    overrides: Partial<ExaminationQuestion> = {},
): ExaminationQuestion {
    return {
        id: 1,
        question: {
            id: 10,
            type,
            question: '<p>Q?</p>',
            options: [],
            tags: [],
            questionOwners: [],
            state: 'PUBLISHED',
            defaultNegativeScoreAllowed: false,
            defaultOptionShufflingOn: false,
        },
        essayAnswer: undefined,
        clozeTestAnswer: undefined,
        options: [],
        evaluationType: 'Points',
        forcedScore: null,
        maxScore: 10,
        derivedMaxScore: 10,
        derivedMinScore: 0,
        selectedOption: 0,
        answered: false,
        expanded: true,
        answerInstructions: '',
        evaluationCriteria: '',
        negativeScoreAllowed: false,
        optionShufflingOn: false,
        sequenceNumber: 1,
        questionStatus: '',
        autosaved: undefined as unknown as Date,
        ...overrides,
    } as ExaminationQuestion;
}

function makeEssayQuestion(answer?: string): ExaminationQuestion {
    return makeQuestion('EssayQuestion', {
        essayAnswer: answer !== undefined ? ({ id: 1, answer, objectVersion: 1 } as EssayAnswer) : undefined,
    });
}

function makeClozeQuestion(answer?: string): ExaminationQuestion {
    return makeQuestion('ClozeTestQuestion', {
        clozeTestAnswer:
            answer !== undefined
                ? ({ id: 2, answer, objectVersion: 1, maxScore: 5, question: '' } as ClozeTestAnswer)
                : undefined,
    });
}

function makeSection(sectionQuestions: ExaminationQuestion[]): ExaminationSection {
    return {
        id: 1,
        name: 'S1',
        sectionQuestions,
        lotteryOn: false,
        lotteryItemCount: 0,
        sequenceNumber: 1,
    } as unknown as ExaminationSection;
}

function makeExam(sections: ExaminationSection[]): Examination {
    return { id: 1, hash: 'exam-hash', examSections: sections, external: false } as unknown as Examination;
}

describe('ExaminationService', () => {
    let service: ExaminationService;
    let httpTesting: HttpTestingController;
    let toastr: ToastrService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot(), ToastrModule.forRoot()],
            providers: [ExaminationService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
        });
        service = TestBed.inject(ExaminationService);
        httpTesting = TestBed.inject(HttpTestingController);
        toastr = TestBed.inject(ToastrService);
    });

    afterEach(() => httpTesting.verify());

    describe('saveTextualAnswer$', () => {
        it('posts essay answer to correct URL', () => {
            const q = makeEssayQuestion('hello');
            service.saveTextualAnswer$(q, 'abc', { autosave: false, canFail: false, external: false }).subscribe();
            const req = httpTesting.expectOne('/app/student/exam/abc/question/1');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ answer: 'hello', objectVersion: 1 });
            req.flush({ objectVersion: 2 });
        });

        it('posts cloze answer to correct URL', () => {
            const q = makeClozeQuestion('{"f1":"v1"}');
            service.saveTextualAnswer$(q, 'abc', { autosave: false, canFail: false, external: false }).subscribe();
            const req = httpTesting.expectOne('/app/student/exam/abc/clozetest/1');
            expect(req.request.body).toEqual({ answer: '{"f1":"v1"}', objectVersion: 1 });
            req.flush({ objectVersion: 2 });
        });

        it('uses iop URL for external exams', () => {
            const q = makeEssayQuestion('hi');
            service.saveTextualAnswer$(q, 'abc', { autosave: false, canFail: false, external: true }).subscribe();
            const req = httpTesting.expectOne('/app/iop/student/exam/abc/question/1');
            req.flush({ objectVersion: 2 });
        });

        it('updates objectVersion on the answer object after save', () => {
            const q = makeEssayQuestion('hi');
            service.saveTextualAnswer$(q, 'abc', { autosave: false, canFail: false, external: false }).subscribe();
            httpTesting.expectOne('/app/student/exam/abc/question/1').flush({ objectVersion: 99 });
            expect(q.essayAnswer!.objectVersion).toBe(99);
        });

        it('shows info toast on manual save', () => {
            const spy = vi.spyOn(toastr, 'info');
            const q = makeEssayQuestion('hi');
            service.saveTextualAnswer$(q, 'abc', { autosave: false, canFail: false, external: false }).subscribe();
            httpTesting.expectOne('/app/student/exam/abc/question/1').flush({ objectVersion: 2 });
            expect(spy).toHaveBeenCalled();
        });

        it('does not show toast when autosave=true', () => {
            const spy = vi.spyOn(toastr, 'info');
            const q = makeEssayQuestion('hi');
            service.saveTextualAnswer$(q, 'abc', { autosave: true, canFail: true, external: false }).subscribe();
            httpTesting.expectOne('/app/student/exam/abc/question/1').flush({ objectVersion: 2 });
            expect(spy).not.toHaveBeenCalled();
        });

        it('shows error toast on failure when canFail=false', () => {
            const spy = vi.spyOn(toastr, 'error');
            const q = makeEssayQuestion('hi');
            service
                .saveTextualAnswer$(q, 'abc', { autosave: false, canFail: false, external: false })
                .subscribe({ error: () => {} });
            httpTesting
                .expectOne('/app/student/exam/abc/question/1')
                .flush('error', { status: 500, statusText: 'error' });
            expect(spy).toHaveBeenCalled();
        });

        it('suppresses error toast when canFail=true', () => {
            const spy = vi.spyOn(toastr, 'error');
            const q = makeEssayQuestion('hi');
            service
                .saveTextualAnswer$(q, 'abc', { autosave: true, canFail: true, external: false })
                .subscribe({ error: () => {} });
            httpTesting
                .expectOne('/app/student/exam/abc/question/1')
                .flush('error', { status: 500, statusText: 'error' });
            expect(spy).not.toHaveBeenCalled();
        });

        it('throws synchronously when answer object is missing', () => {
            const q = makeEssayQuestion();
            expect(() =>
                service.saveTextualAnswer$(q, 'abc', { autosave: false, canFail: false, external: false }),
            ).toThrow('no answer object in question');
        });
    });

    describe('saveAllTextualAnswersOfSection$', () => {
        it('saves all essay and cloze questions sequentially', () => {
            const q1 = makeEssayQuestion('hello');
            const q2 = { ...makeClozeQuestion('{"f":"v"}'), id: 2 };
            const section = makeSection([q1, q2]);
            const results: ExaminationQuestion[] = [];

            service
                .saveAllTextualAnswersOfSection$(section, 'h', {
                    autosave: false,
                    allowEmpty: true,
                    canFail: true,
                    external: false,
                })
                .subscribe((q) => results.push(q));

            httpTesting.expectOne('/app/student/exam/h/question/1').flush({ objectVersion: 2 });
            httpTesting.expectOne('/app/student/exam/h/clozetest/2').flush({ objectVersion: 2 });
            expect(results.length).toBe(2);
        });

        it('skips questions without answers when allowEmpty=false', () => {
            const q1 = { ...makeEssayQuestion(''), id: 1 };
            const q2 = { ...makeEssayQuestion('non-empty'), id: 2 };
            const section = makeSection([q1, q2]);

            service
                .saveAllTextualAnswersOfSection$(section, 'h', {
                    autosave: false,
                    allowEmpty: false,
                    canFail: true,
                    external: false,
                })
                .subscribe();

            httpTesting.expectNone('/app/student/exam/h/question/1');
            httpTesting.expectOne('/app/student/exam/h/question/2').flush({ objectVersion: 2 });
        });

        it('skips questions with null essayAnswer when allowEmpty=false', () => {
            const section = makeSection([makeEssayQuestion()]);
            const results: ExaminationQuestion[] = [];

            service
                .saveAllTextualAnswersOfSection$(section, 'h', {
                    autosave: false,
                    allowEmpty: false,
                    canFail: true,
                    external: false,
                })
                .subscribe((q) => results.push(q));

            httpTesting.expectNone((r) => r.url.includes('/question/'));
            expect(results.length).toBe(0);
        });

        it('skips non-textual question types', () => {
            const section = makeSection([makeQuestion('MultipleChoiceQuestion')]);
            const results: ExaminationQuestion[] = [];

            service
                .saveAllTextualAnswersOfSection$(section, 'h', {
                    autosave: false,
                    allowEmpty: true,
                    canFail: true,
                    external: false,
                })
                .subscribe((q) => results.push(q));

            httpTesting.expectNone((r) => r.url.includes('/question/'));
            expect(results.length).toBe(0);
        });
    });

    describe('saveAllClozeTestAnswersOfSection$', () => {
        it('saves only cloze test questions, skipping essays', () => {
            const essay = makeEssayQuestion('some answer');
            const cloze = { ...makeClozeQuestion('{"f":"v"}'), id: 2 };
            const section = makeSection([essay, cloze]);

            service
                .saveAllClozeTestAnswersOfSection$(section, 'h', {
                    autosave: true,
                    allowEmpty: true,
                    canFail: true,
                    external: false,
                })
                .subscribe();

            httpTesting.expectNone('/app/student/exam/h/question/1');
            httpTesting.expectOne('/app/student/exam/h/clozetest/2').flush({ objectVersion: 2 });
        });

        it('skips cloze questions with no answer when allowEmpty=false', () => {
            const section = makeSection([makeClozeQuestion()]);

            service
                .saveAllClozeTestAnswersOfSection$(section, 'h', {
                    autosave: true,
                    allowEmpty: false,
                    canFail: true,
                    external: false,
                })
                .subscribe();

            httpTesting.expectNone((r) => r.url.includes('/clozetest/'));
        });
    });

    describe('saveAllTextualAnswersOfExam$', () => {
        it('saves all textual answers across all sections', () => {
            const q1 = makeEssayQuestion('a1');
            const q2 = { ...makeEssayQuestion('a2'), id: 2 };
            const exam = makeExam([makeSection([q1]), makeSection([q2])]);

            service.saveAllTextualAnswersOfExam$(exam, false).subscribe();

            httpTesting.expectOne('/app/student/exam/exam-hash/question/1').flush({ objectVersion: 2 });
            httpTesting.expectOne('/app/student/exam/exam-hash/question/2').flush({ objectVersion: 2 });
        });

        it('uses iop URLs for external exams', () => {
            const q = makeEssayQuestion('hi');
            const exam = { ...makeExam([makeSection([q])]), external: true };

            service.saveAllTextualAnswersOfExam$(exam, true).subscribe();

            httpTesting.expectOne('/app/iop/student/exam/exam-hash/question/1').flush({ objectVersion: 2 });
        });

        // Fixed: examination-question.component.ts now returns the original question object
        // directly from sq() without spreading. Child-component mutations therefore always
        // affect the original, which is what saveAllTextualAnswersOfExam$ iterates.

        it('saves text typed when essayAnswer was initially null (sq returns original, no spread)', () => {
            const original = makeEssayQuestion();
            const exam = makeExam([makeSection([original])]);

            // sq() === original (no spread); essay component initialises essayAnswer on the original:
            Object.assign(original, { essayAnswer: { answer: '', objectVersion: undefined } });
            // answerChanged() mutates the original's essayAnswer:
            (original.essayAnswer as EssayAnswer).answer = 'Hello world';

            expect(original.essayAnswer!.answer).toBe('Hello world');

            service.saveAllTextualAnswersOfExam$(exam, false).subscribe();

            httpTesting.expectOne('/app/student/exam/exam-hash/question/1').flush({ objectVersion: 2 });
        });

        it('saves text typed when original essayAnswer was non-null', () => {
            const original = makeEssayQuestion('');
            const exam = makeExam([makeSection([original])]);

            original.essayAnswer!.answer = 'Hello world';

            service.saveAllTextualAnswersOfExam$(exam, false).subscribe();

            httpTesting.expectOne('/app/student/exam/exam-hash/question/1').flush({ objectVersion: 2 });
        });
    });
});
