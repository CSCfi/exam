// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrModule } from 'ngx-toastr';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import type { ExamSectionQuestion } from 'src/app/question/question.model';
import { SessionService } from 'src/app/session/session.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { vi } from 'vitest';
import type { Exam, ExamSection } from './exam.model';
import { ExamService } from './exam.service';

function makeSection(overrides: Partial<ExamSection> = {}): ExamSection {
    return {
        id: 1,
        name: '',
        sectionQuestions: [],
        lotteryOn: false,
        lotteryItemCount: 0,
        sequenceNumber: 0,
        ...overrides,
    } as ExamSection;
}

function makeExam(overrides: Partial<Exam> = {}): Exam {
    return {
        id: 1,
        examSections: [],
        children: [],
        examOwners: [],
        examEnrolments: [],
        hasEnrolmentsInEffect: false,
        state: 'DRAFT',
        ...overrides,
    } as unknown as Exam;
}

describe('ExamService', () => {
    let service: ExamService;
    let mockSession: { getUser: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        mockSession = {
            getUser: vi
                .fn()
                .mockReturnValue({ id: 1, isAdmin: false, isSupport: false, eppn: 'u@e.fi', email: 'u@e.fi' }),
        };
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot(), ToastrModule.forRoot()],
            providers: [
                ExamService,
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
                { provide: SessionService, useValue: mockSession },
                { provide: ConfirmationDialogService, useValue: { open$: vi.fn() } },
                CommonExamService,
                QuestionScoringService,
            ],
        });
        service = TestBed.inject(ExamService);
    });

    afterEach(() => TestBed.inject(HttpTestingController).verify());

    describe('getReviewablesCount', () => {
        it('should count children in REVIEW or REVIEW_STARTED state', () => {
            const exam = makeExam({
                children: [
                    { state: 'REVIEW' },
                    { state: 'REVIEW_STARTED' },
                    { state: 'GRADED' },
                    { state: 'REVIEW' },
                ] as unknown as Exam[],
            });
            expect(service.getReviewablesCount(exam)).toBe(3);
        });

        it('should return 0 when no children are in review states', () => {
            const exam = makeExam({ children: [{ state: 'GRADED' }, { state: 'ARCHIVED' }] as unknown as Exam[] });
            expect(service.getReviewablesCount(exam)).toBe(0);
        });
    });

    describe('getGradedCount', () => {
        it('should count only children in GRADED state', () => {
            const exam = makeExam({
                children: [{ state: 'GRADED' }, { state: 'REVIEW' }, { state: 'GRADED' }] as unknown as Exam[],
            });
            expect(service.getGradedCount(exam)).toBe(2);
        });
    });

    describe('getProcessedCount', () => {
        it('should count children not in REVIEW, REVIEW_STARTED or GRADED', () => {
            const exam = makeExam({
                children: [
                    { state: 'REVIEW' },
                    { state: 'GRADED' },
                    { state: 'ARCHIVED' },
                    { state: 'ABORTED' },
                ] as unknown as Exam[],
            });
            expect(service.getProcessedCount(exam)).toBe(2);
        });
    });

    describe('hasQuestions', () => {
        it('should return false when all sections are empty', () => {
            expect(service.hasQuestions({ examSections: [makeSection()] })).toBe(false);
        });

        it('should return true when any section has a question', () => {
            const section = makeSection({ sectionQuestions: [{ id: 1 } as unknown as ExamSectionQuestion] });
            expect(service.hasQuestions({ examSections: [section] })).toBe(true);
        });
    });

    describe('hasEssayQuestions', () => {
        it('should return false when there are no essay questions', () => {
            const section = makeSection({
                sectionQuestions: [{ question: { type: 'MultipleChoiceQuestion' } } as unknown as ExamSectionQuestion],
            });
            expect(service.hasEssayQuestions({ examSections: [section] })).toBe(false);
        });

        it('should return true when at least one essay question exists', () => {
            const section = makeSection({
                sectionQuestions: [{ question: { type: 'EssayQuestion' } } as unknown as ExamSectionQuestion],
            });
            expect(service.hasEssayQuestions({ examSections: [section] })).toBe(true);
        });
    });

    describe('getResource', () => {
        it('should return the original URL when not collaborative', () => {
            expect(service.getResource('/app/exams/1')).toBe('/app/exams/1');
        });

        it('should replace /app/exams/ with /app/iop/exams/ for collaborative', () => {
            expect(service.getResource('/app/exams/1', true)).toBe('/app/iop/exams/1');
        });
    });

    describe('isAllowedToUnpublishOrRemove', () => {
        it('should return false for non-collaborative when exam has enrolments in effect', () => {
            const exam = makeExam({ hasEnrolmentsInEffect: true, children: [] });
            expect(service.isAllowedToUnpublishOrRemove(exam)).toBe(false);
        });

        it('should return false for non-collaborative when exam has children', () => {
            const exam = makeExam({
                hasEnrolmentsInEffect: false,
                children: [{ state: 'REVIEW' }] as unknown as Exam[],
            });
            expect(service.isAllowedToUnpublishOrRemove(exam)).toBe(false);
        });

        it('should return true for non-collaborative when no enrolments and no children', () => {
            const exam = makeExam({ hasEnrolmentsInEffect: false, children: [] });
            expect(service.isAllowedToUnpublishOrRemove(exam)).toBe(true);
        });

        it('should return true for collaborative when admin and exam is in DRAFT state', () => {
            mockSession.getUser.mockReturnValue({ id: 1, isAdmin: true });
            const exam = makeExam({ state: 'DRAFT' });
            expect(service.isAllowedToUnpublishOrRemove(exam, true)).toBe(true);
        });

        it('should return false for collaborative when admin but exam is PUBLISHED', () => {
            mockSession.getUser.mockReturnValue({ id: 1, isAdmin: true });
            const exam = makeExam({ state: 'PUBLISHED' });
            expect(service.isAllowedToUnpublishOrRemove(exam, true)).toBe(false);
        });
    });

    describe('getMaxScore', () => {
        it('should return 0 for an exam with no sections', () => {
            expect(service.getMaxScore({ examSections: [] })).toBe(0);
        });

        it('should sum maxScore across all sections and questions', () => {
            const section = makeSection({
                sectionQuestions: [
                    {
                        id: 1,
                        question: { type: 'MultipleChoiceQuestion' },
                        maxScore: 5,
                        options: [],
                        forcedScore: null,
                        negativeScoreAllowed: false,
                        optionShufflingOn: false,
                        sequenceNumber: 0,
                        answerInstructions: '',
                        evaluationCriteria: '',
                    } as unknown as ExamSectionQuestion,
                    {
                        id: 2,
                        question: { type: 'MultipleChoiceQuestion' },
                        maxScore: 3,
                        options: [],
                        forcedScore: null,
                        negativeScoreAllowed: false,
                        optionShufflingOn: false,
                        sequenceNumber: 1,
                        answerInstructions: '',
                        evaluationCriteria: '',
                    } as unknown as ExamSectionQuestion,
                ],
            });
            expect(service.getMaxScore({ examSections: [section] })).toBe(8);
        });

        it('should scale maxScore by lottery ratio when lotteryOn is true', () => {
            // 2 questions × maxScore 10 each = 20 total. lotteryItemCount = 1 out of 2 → 20 * 1 / 2 = 10
            const section = makeSection({
                lotteryOn: true,
                lotteryItemCount: 1,
                sectionQuestions: [
                    {
                        id: 1,
                        question: { type: 'MultipleChoiceQuestion' },
                        maxScore: 10,
                        options: [],
                        forcedScore: null,
                        negativeScoreAllowed: false,
                        optionShufflingOn: false,
                        sequenceNumber: 0,
                        answerInstructions: '',
                        evaluationCriteria: '',
                    } as unknown as ExamSectionQuestion,
                    {
                        id: 2,
                        question: { type: 'MultipleChoiceQuestion' },
                        maxScore: 10,
                        options: [],
                        forcedScore: null,
                        negativeScoreAllowed: false,
                        optionShufflingOn: false,
                        sequenceNumber: 1,
                        answerInstructions: '',
                        evaluationCriteria: '',
                    } as unknown as ExamSectionQuestion,
                ],
            });
            expect(service.getMaxScore({ examSections: [section] })).toBe(10);
        });
    });
});
