// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import type { ExamSectionQuestion } from 'src/app/question/question.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
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
            imports: [TranslateModule.forRoot()],
            providers: [
                ExamService,
                provideHttpClient(withXhr()),
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

        it('should treat null/undefined examSections as empty (IOP JSON)', () => {
            expect(service.getMaxScore({ examSections: null as unknown as ExamSection[] })).toBe(0);
            expect(service.getMaxScore({ examSections: undefined as unknown as ExamSection[] })).toBe(0);
        });

        it('should treat null sectionQuestions as empty when summing max score', () => {
            const section = makeSection({ sectionQuestions: null as unknown as ExamSectionQuestion[] });
            expect(service.getMaxScore({ examSections: [section] })).toBe(0);
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
    describe('owners', () => {
        const owner = (id: number, eppn = `o${id}@e.fi`) => ({ id, eppn, email: eppn }) as unknown as User;

        it('should count the owners of the exam, or of its parent for an attempt', () => {
            expect(service.isOwner(makeExam({ examOwners: [owner(1)] } as Partial<Exam>))).toBe(true);
            expect(service.isOwner(makeExam({ examOwners: [owner(2)] } as Partial<Exam>))).toBe(false);
            const attempt = makeExam({ examOwners: [], parent: makeExam({ examOwners: [owner(1)] }) } as Partial<Exam>);
            expect(service.isOwner(attempt)).toBe(true);
        });

        it('should match a collaborative owner by eppn or email, as ids differ between organisations', () => {
            const exam = makeExam({ examOwners: [owner(99, 'u@e.fi')] } as Partial<Exam>);
            expect(service.isOwner(exam, true)).toBe(true);
            expect(service.isOwner(exam, false)).toBe(false);
        });

        it('should let administrators and support staff act as owners', () => {
            const exam = makeExam({ examOwners: [owner(2)] } as Partial<Exam>);
            expect(service.isOwnerOrAdmin(exam)).toBe(false);
            mockSession.getUser.mockReturnValue({ id: 1, isAdmin: false, isSupport: true });
            expect(service.isOwnerOrAdmin(exam)).toBe(true);
            mockSession.getUser.mockReturnValue({ id: 1, isAdmin: true, isSupport: false });
            expect(service.isOwnerOrAdmin(exam)).toBe(true);
        });
    });

    describe('scores', () => {
        type Points = { score: number; approved: boolean; rejected: boolean };
        /** Questions answered with the given points */
        const answered = (...points: Points[]) => {
            const scoring = TestBed.inject(QuestionScoringService);
            const queue = [...points];
            vi.spyOn(scoring, 'calculateAnswerScore').mockImplementation(() => queue.shift()!);
            return makeSection({
                sectionQuestions: points.map(() => ({ question: { type: 'EssayQuestion' } })) as ExamSectionQuestion[],
            });
        };
        const numeric = (score: number): Points => ({ score, approved: false, rejected: false });

        it('should add up the points of numerically scored answers', () => {
            const section = answered(numeric(1.5), numeric(2.25));
            expect(service.getTotalScore({ examSections: [section] })).toBe(3.75);
        });

        it('should leave approved or rejected answers out of the total, but not out of the section score', () => {
            expect(
                service.getSectionTotalNumericScore(
                    answered(numeric(2), { score: 1, approved: true, rejected: false }),
                ),
            ).toBe(2);
            expect(
                service.getSectionTotalScore(answered(numeric(2), { score: 1, approved: true, rejected: false })),
            ).toBe(3);
        });

        it('should round to two decimals', () => {
            expect(service.getSectionTotalNumericScore(answered(numeric(0.1), numeric(0.2)))).toBe(0.3);
            expect(service.getTotalScore({ examSections: [answered(numeric(1 / 3), numeric(1 / 3))] })).toBe(0.67);
        });

        it('should never give a negative total', () => {
            expect(service.getTotalScore({ examSections: [answered(numeric(-3), numeric(1))] })).toBe(0);
        });

        it('should count nothing for an exam without sections', () => {
            expect(service.getTotalScore({ examSections: undefined } as unknown as Exam)).toBe(0);
        });
    });

    describe('saving', () => {
        it('should send the editable fields, the period ending at the end of its last day', () => {
            const http = TestBed.inject(HttpTestingController);
            const exam = makeExam({
                id: 5,
                name: 'Algebra',
                periodStart: '2026-06-01T00:00:00.000Z',
                periodEnd: '2026-06-30T00:00:00.000Z',
                gradeScale: { id: 3 },
                trialCount: 0,
            } as unknown as Partial<Exam>);

            service.updateExam$(exam, { name: 'Overridden' }).subscribe();
            const body = http.expectOne((r) => r.method === 'PUT' && r.url === '/app/exams/5').request.body;
            expect(body).toMatchObject({ id: 5, name: 'Overridden', grading: 3, instruction: '' });
            expect(body.periodStart).toBe(Date.parse('2026-06-01T00:00:00.000Z'));
            const end = new Date(body.periodEnd);
            expect([end.getHours(), end.getMinutes(), end.getSeconds(), end.getMilliseconds()]).toEqual([
                23, 59, 59, 999,
            ]);
            expect(body.trialCount).toBeUndefined();

            service.updateExam$(exam, {}, true).subscribe();
            http.expectOne('/app/iop/exams/5');
        });

        it('should tell whether students have upcoming reservations when downloading an exam', () => {
            const http = TestBed.inject(HttpTestingController);
            const results: boolean[] = [];
            service.downloadExam$(5).subscribe((e) => results.push(e.hasEnrolmentsInEffect));
            const future = new Date(Date.now() + 3600_000).toISOString();
            http.expectOne('/app/exams/5').flush(
                makeExam({ examEnrolments: [{ reservation: { endAt: future } }] } as unknown as Partial<Exam>),
            );
            service.downloadExam$(5).subscribe((e) => results.push(e.hasEnrolmentsInEffect));
            http.expectOne('/app/exams/5').flush(
                makeExam({
                    examEnrolments: [{ reservation: { endAt: '2020-01-01T00:00:00Z' } }, {}],
                } as unknown as Partial<Exam>),
            );
            expect(results).toEqual([true, false]);
        });

        it('should create a draft and go on to choose its course', () => {
            const http = TestBed.inject(HttpTestingController);
            const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
            service.createExam('PRIVATE', 'CLIENT_AUTH');
            const req = http.expectOne('/app/exams');
            expect(req.request.body).toEqual({ executionType: { type: 'PRIVATE' }, implementation: 'CLIENT_AUTH' });
            req.flush({ id: 8 });
            expect(navigate).toHaveBeenCalledWith(['/staff/exams', 8, 'course']);
        });
    });

    describe('removing', () => {
        it('should delete on confirmation and return to the front page', () => {
            const http = TestBed.inject(HttpTestingController);
            const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
            vi.mocked(TestBed.inject(ConfirmationDialogService).open$).mockReturnValue(of(true));

            service.removeExam(makeExam({ id: 5 }), false, true);
            http.expectOne((r) => r.method === 'DELETE' && r.url === '/app/exams/5').flush({});
            expect(navigate).toHaveBeenCalledWith(['/staff', 'admin']);

            mockSession.getUser.mockReturnValue({ id: 1, isAdmin: true });
            service.removeExam(makeExam({ id: 6, state: 'DRAFT' }), true, false);
            http.expectOne((r) => r.method === 'DELETE' && r.url === '/app/iop/exams/6').flush({});
            expect(navigate).toHaveBeenLastCalledWith(['/staff', 'teacher']);
        });

        it('should refuse an exam already taken, without asking', () => {
            const warning = vi.spyOn(TestBed.inject(ToastService), 'warning').mockReturnValue(undefined as never);
            const confirm = TestBed.inject(ConfirmationDialogService).open$;
            service.removeExam(makeExam({ children: [makeExam({ id: 9 })] } as Partial<Exam>));
            expect(confirm).not.toHaveBeenCalled();
            expect(warning).toHaveBeenCalled();
        });
    });

    describe('previewing', () => {
        it('should open the preview that fits the exam', () => {
            const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
            const exam = (type: string) => makeExam({ id: 5, executionType: { type } } as unknown as Partial<Exam>);
            service.previewExam(exam('PUBLIC'), 2, true);
            expect(navigate).toHaveBeenLastCalledWith(['/staff/exams', 5, 'preview', 'collaborative'], {
                queryParams: { tab: 2 },
            });
            service.previewExam(exam('PRINTOUT'), 2, false);
            expect(navigate).toHaveBeenLastCalledWith(['/staff/exams', 5, 'printout'], { queryParams: { tab: 2 } });
            service.previewExam(exam('PUBLIC'), 1, false);
            expect(navigate).toHaveBeenLastCalledWith(['/staff/exams', 5, 'preview'], { queryParams: { tab: 1 } });
        });
    });
});
