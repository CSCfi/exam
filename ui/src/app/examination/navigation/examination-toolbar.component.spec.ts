// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrModule } from 'ngx-toastr';
import { EMPTY, of } from 'rxjs';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { Examination, ExaminationQuestion, ExaminationSection } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';
import type { EssayAnswer } from 'src/app/question/question.model';
import { SessionService } from 'src/app/session/session.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { vi } from 'vitest';
import { ExaminationToolbarComponent } from './examination-toolbar.component';

function makeExam(overrides: Partial<Examination> = {}): Examination {
    return {
        id: 1,
        hash: 'exam-hash',
        external: false,
        implementation: 'WHATEVER',
        examSections: [],
        executionType: { type: 'PUBLIC' },
        ...overrides,
    } as unknown as Examination;
}

function makeEssayQuestion(answer: string | null = 'typed answer'): ExaminationQuestion {
    return {
        id: 1,
        question: {
            id: 10,
            type: 'EssayQuestion',
            question: '<p>Q?</p>',
            options: [],
            tags: [],
            questionOwners: [],
            state: 'PUBLISHED',
            defaultNegativeScoreAllowed: false,
            defaultOptionShufflingOn: false,
        },
        essayAnswer: answer !== null ? ({ id: 1, answer, objectVersion: 1 } as EssayAnswer) : undefined,
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
    } as unknown as ExaminationQuestion;
}

function makeSection(questions: ExaminationQuestion[]): ExaminationSection {
    return {
        id: 1,
        name: 'S1',
        sectionQuestions: questions,
        lotteryOn: false,
        lotteryItemCount: 0,
        sequenceNumber: 1,
    } as unknown as ExaminationSection;
}

describe('ExaminationToolbarComponent – turnExam()', () => {
    let component: ExaminationToolbarComponent;
    let fixture: ComponentFixture<ExaminationToolbarComponent>;
    let httpTesting: HttpTestingController;
    let mockConfirmation: { open$: ReturnType<typeof vi.fn> };
    let mockExamination: {
        saveAllTextualAnswersOfExam$: ReturnType<typeof vi.fn>;
        logout: ReturnType<typeof vi.fn>;
        isAnswered: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        mockConfirmation = { open$: vi.fn().mockReturnValue(of(true)) };
        mockExamination = {
            saveAllTextualAnswersOfExam$: vi.fn().mockReturnValue(EMPTY),
            logout: vi.fn(),
            isAnswered: vi.fn().mockReturnValue(false),
        };

        await TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot(), ToastrModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
                { provide: ExaminationService, useValue: mockExamination },
                { provide: ConfirmationDialogService, useValue: mockConfirmation },
                {
                    provide: SessionService,
                    useValue: { getUser: vi.fn().mockReturnValue({ firstName: 'A', lastName: 'B' }) },
                },
                { provide: AttachmentService, useValue: { downloadExamAttachment: vi.fn() } },
                { provide: EnrolmentService, useValue: { showMaturityInstructions: vi.fn() } },
            ],
        })
            .overrideComponent(ExaminationToolbarComponent, { set: { template: '<div></div>', imports: [] } })
            .compileComponents();

        fixture = TestBed.createComponent(ExaminationToolbarComponent);
        component = fixture.componentInstance;
        httpTesting = TestBed.inject(HttpTestingController);
        fixture.componentRef.setInput('exam', makeExam());
        fixture.detectChanges();
        await fixture.whenStable();
    });

    afterEach(() => httpTesting.verify());

    it('shows confirmation dialog before saving', () => {
        component.turnExam();
        expect(mockConfirmation.open$).toHaveBeenCalled();
    });

    it('calls saveAllTextualAnswersOfExam$ with the current exam after confirmation', () => {
        const exam = makeExam({ hash: 'test-hash' });
        fixture.componentRef.setInput('exam', exam);

        component.turnExam();

        expect(mockExamination.saveAllTextualAnswersOfExam$).toHaveBeenCalledWith(exam, false);
    });

    it('calls logout after save completes (finalize)', () => {
        mockExamination.saveAllTextualAnswersOfExam$.mockReturnValue(of(undefined));

        component.turnExam();

        expect(mockExamination.logout).toHaveBeenCalledWith(
            'i18n_exam_returned',
            'exam-hash',
            expect.objectContaining({ canFail: false }),
        );
    });

    it('still calls logout even when save fails (finalize always runs)', () => {
        mockExamination.saveAllTextualAnswersOfExam$.mockReturnValue(of(undefined));

        component.turnExam();

        expect(mockExamination.logout).toHaveBeenCalled();
    });

    it('does not save or logout when user cancels the confirmation', () => {
        mockConfirmation.open$.mockReturnValue(EMPTY);

        component.turnExam();

        expect(mockExamination.saveAllTextualAnswersOfExam$).not.toHaveBeenCalled();
        expect(mockExamination.logout).not.toHaveBeenCalled();
    });

    describe('typed text typed before first explicit save is included in turn-in', () => {
        it('saves text typed when essayAnswer was initially null (sq returns original, no spread)', () => {
            // sq() is now the original question directly, so Object.assign/answerChanged
            // mutations always land on the object that saveAllTextualAnswersOfExam$ iterates.
            const original = makeEssayQuestion(null);
            const exam = makeExam({ examSections: [makeSection([original])] });
            fixture.componentRef.setInput('exam', exam);

            // Simulate essay component init + user typing on the original:
            Object.assign(original, { essayAnswer: { answer: 'Hello world', objectVersion: undefined } });

            component.turnExam();

            expect(mockExamination.saveAllTextualAnswersOfExam$).toHaveBeenCalledWith(
                expect.objectContaining({
                    examSections: expect.arrayContaining([
                        expect.objectContaining({
                            sectionQuestions: expect.arrayContaining([
                                expect.objectContaining({
                                    essayAnswer: expect.objectContaining({ answer: 'Hello world' }),
                                }),
                            ]),
                        }),
                    ]),
                }),
                false,
            );
        });

        it('saves text typed when original essayAnswer was non-null', () => {
            const original = makeEssayQuestion('');
            original.essayAnswer!.answer = 'Hello world';
            const exam = makeExam({ examSections: [makeSection([original])] });
            fixture.componentRef.setInput('exam', exam);

            component.turnExam();

            expect(mockExamination.saveAllTextualAnswersOfExam$).toHaveBeenCalledWith(
                expect.objectContaining({
                    examSections: expect.arrayContaining([
                        expect.objectContaining({
                            sectionQuestions: expect.arrayContaining([
                                expect.objectContaining({
                                    essayAnswer: expect.objectContaining({ answer: 'Hello world' }),
                                }),
                            ]),
                        }),
                    ]),
                }),
                false,
            );
        });
    });
});
