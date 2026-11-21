// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom, of, toArray } from 'rxjs';
import type { Exam } from 'src/app/exam/exam.model';
import { errorInterceptor } from 'src/app/interceptors/error.interceptor';
import type { ExamSectionQuestion } from 'src/app/question/question.model';
import { SessionService } from 'src/app/session/session.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { AssessmentService } from './assessment.service';

describe('AssessmentService', () => {
    let service: AssessmentService;
    let http: HttpTestingController;
    const toast = { info: vi.fn(), warning: vi.fn(), error: vi.fn() };
    const router = { navigate: vi.fn() };
    const dialogs = { open$: vi.fn(() => of(true)) };
    let user: { id: number; isAdmin: boolean };

    const exam = (overrides: Partial<Exam> = {}): Exam =>
        ({
            id: 5,
            state: 'REVIEW_STARTED',
            parent: { id: 1 },
            grade: { id: 11, name: '5', marksRejection: false },
            gradingType: 'GRADED',
            customCredit: 5,
            course: { credits: 5 },
            creditType: { type: 'FINAL' },
            answerLanguage: 'fi',
            examLanguages: [],
            examFeedback: { id: 3, comment: 'Good' },
            executionType: { type: 'PUBLIC' },
            ...overrides,
        }) as unknown as Exam;

    beforeEach(() => {
        vi.clearAllMocks();
        user = { id: 1, isAdmin: false };
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideHttpClient(withInterceptors([errorInterceptor])),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
                { provide: Router, useValue: router },
                { provide: ConfirmationDialogService, useValue: dialogs },
                { provide: SessionService, useValue: { getUser: () => user } },
            ],
        });
        service = TestBed.inject(AssessmentService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    describe('payload', () => {
        it('should send the grade id and credit type', () => {
            expect(service.getPayload(exam(), 'GRADED')).toEqual({
                id: 5,
                state: 'GRADED',
                grade: 11,
                customCredit: 5,
                creditType: 'FINAL',
                answerLanguage: 'fi',
                additionalInfo: undefined,
                gradingType: 'GRADED',
            });
        });

        it('should keep the current state and leave out a non-grade', () => {
            const payload = service.getPayload(
                exam({ grade: { type: 'NOT_GRADED', name: '', marksRejection: false } as unknown as Exam['grade'] }),
            );
            expect(payload.state).toBe('REVIEW_STARTED');
            expect(payload.grade).toBeUndefined();
        });
    });

    it('should list what is missing before grading', () => {
        expect(service.getErrors(exam())).toEqual([]);
        expect(service.getErrors(exam({ grade: undefined, creditType: undefined, answerLanguage: undefined }))).toEqual(
            ['i18n_participation_unreviewed', 'i18n_exam_choose_credit_type', 'i18n_exam_choose_response_language'],
        );
        expect(service.getErrors(exam({ grade: undefined, gradingType: 'NOT_GRADED' }))).toEqual([]);
    });

    it('should reset an invalid custom credit to the course credits', () => {
        const e = exam({ customCredit: -1 });

        expect(service.checkCredit(e)).toBe(false);
        expect(e.customCredit).toBe(5);
        expect(toast.error).toHaveBeenCalledWith('i18n_not_a_valid_custom_credit');
    });

    it('should pick the answer language or the only exam language', () => {
        expect(service.pickExamLanguage(exam())).toEqual({ code: 'fi', name: '' });
        const sv = { code: 'sv', name: 'svenska' };
        expect(service.pickExamLanguage(exam({ answerLanguage: undefined, examLanguages: [sv] }))).toBe(sv);
        expect(service.pickExamLanguage(exam({ answerLanguage: undefined }))).toBeNull();
    });

    it('should tell read-only states apart', () => {
        expect(service.isReadOnly(exam({ state: 'GRADED_LOGGED' }))).toBe(true);
        expect(service.isReadOnly(exam({ state: 'REJECTED' }))).toBe(true);
        expect(service.isReadOnly(exam({ state: 'GRADED' }))).toBe(false);
    });

    it('should exit to the parent exam, or to the admin view for admins', () => {
        expect(service.getExitState(exam())).toEqual({
            fragments: ['/staff/exams', '1', '5'],
            params: { collaborative: false },
        });
        user.isAdmin = true;
        expect(service.getExitState(exam())).toEqual({ fragments: ['/staff/admin'] });
    });

    it('should save the feedback and take its id', async () => {
        const e = exam({ examFeedback: { comment: 'New' } as Exam['examFeedback'] });

        const done = firstValueFrom(service.saveFeedback$(e));
        const req = http.expectOne('/app/review/5/comment');
        expect(req.request.body).toEqual({ id: undefined, comment: 'New' });
        req.flush({ id: 9 });
        await done;

        expect(e.examFeedback.id).toBe(9);
        expect(toast.info).toHaveBeenCalledWith('i18n_comment_updated');
    });

    describe('saving the assessment', () => {
        it('should ask before grading and then save review and feedback', () => {
            const e = exam();

            service.saveAssessment(e, true);
            expect(dialogs.open$).toHaveBeenCalled();
            const review = http.expectOne('/app/review/5');
            expect(review.request.body.state).toBe('GRADED');
            review.flush({});
            http.expectOne('/app/review/5/comment').flush({ id: 3 });

            expect(toast.info).toHaveBeenCalledWith('i18n_review_graded');
            expect(router.navigate).toHaveBeenCalledWith(['/staff/exams', '1', '5'], {
                queryParams: { collaborative: false },
            });
        });

        it('should save an incomplete review as started and warn what is missing', () => {
            service.saveAssessment(exam({ answerLanguage: undefined }), true);

            expect(dialogs.open$).not.toHaveBeenCalled();
            const review = http.expectOne('/app/review/5');
            expect(review.request.body.state).toBe('REVIEW_STARTED');
            review.flush({});
            http.expectOne('/app/review/5/comment').flush({ id: 3 });

            expect(toast.warning).toHaveBeenCalledWith('i18n_exam_choose_response_language');
            expect(router.navigate).not.toHaveBeenCalled();
        });

        it('should show why saving failed', () => {
            service.saveAssessment(exam({ answerLanguage: undefined }), true);
            http.expectOne('/app/review/5').flush('i18n_error_access_forbidden', {
                status: 403,
                statusText: 'Forbidden',
            });

            expect(toast.error).toHaveBeenCalledWith('i18n_error_access_forbidden');
        });

        it('should only save the feedback when not allowed to grade', () => {
            service.saveAssessment(exam(), false);
            http.expectOne('/app/review/5/comment').flush({ id: 3 });

            http.expectNone('/app/review/5');
            expect(router.navigate).toHaveBeenCalled();
        });
    });

    describe('recording', () => {
        it('should save, grade and register after confirmation', async () => {
            const e = exam();

            const done = firstValueFrom(service.createExamRecord$(e, true, false).pipe(toArray()));
            http.expectOne('/app/review/5/comment').flush({ id: 3 });
            http.expectOne('/app/review/5').flush({});
            const record = http.expectOne('/app/exam/record');
            expect(record.request.method).toBe('POST');
            expect(record.request.body).toMatchObject({ id: 5, state: 'GRADED_LOGGED', grade: 11 });
            record.flush({});
            await done;
        });

        it('should register an ungraded exam without asking when told so', async () => {
            const done = firstValueFrom(
                service.createExamRecord$(exam({ gradingType: 'NOT_GRADED' }), false, false).pipe(toArray()),
            );
            http.expectOne('/app/exam/register').flush({});
            await done;

            expect(dialogs.open$).not.toHaveBeenCalled();
        });

        it('should not record an incomplete review', async () => {
            const done = firstValueFrom(
                service.createExamRecord$(exam({ creditType: undefined }), true, false).pipe(toArray()),
            );

            expect(await done).toEqual([]);
            expect(toast.error).toHaveBeenCalledWith('i18n_exam_choose_credit_type');
        });

        it('should warn about the feedback setting in the confirmation', () => {
            const content = service.getRecordReviewConfirmationDialogContent('Nice', true);
            expect(content).toContain('Nice');
            expect(content).toContain('i18n_exam_feedback_config_warning');
        });
    });

    describe('scores', () => {
        const question = (score: unknown) =>
            ({ id: 8, essayAnswer: { evaluatedScore: score } }) as unknown as ExamSectionQuestion;

        it('should save an essay score', async () => {
            const done = firstValueFrom(service.saveEssayScore$(question(2)).pipe(toArray()));
            const req = http.expectOne('/app/review/examquestion/8/score');
            expect(req.request.body).toEqual({ evaluatedScore: 2 });
            req.flush(null);
            await done;
        });

        it('should refuse a score that is not a number', async () => {
            await expect(firstValueFrom(service.saveEssayScore$(question('x')))).rejects.toThrow(
                'i18n_error_score_input',
            );
        });

        it('should save a collaborative essay score with the revision', async () => {
            const done = firstValueFrom(service.saveCollaborativeEssayScore$(question(2), 7, 'abc', '1-a'));
            const req = http.expectOne('/app/iop/reviews/7/abc/question/8');
            expect(req.request.body).toEqual({ evaluatedScore: 2, rev: '1-a' });
            req.flush({ rev: '2-b' });

            expect(await done).toEqual({ rev: '2-b' });
        });
    });

    it('should save assessment info only for finished reviews', async () => {
        await firstValueFrom(service.saveAssessmentInfo$(exam()).pipe(toArray()));
        http.expectNone('/app/review/5/info');

        const done = firstValueFrom(
            service.saveAssessmentInfo$(exam({ state: 'GRADED_LOGGED', assessmentInfo: 'x' })).pipe(toArray()),
        );
        http.expectOne('/app/review/5/info').flush(null);
        await done;
        expect(toast.info).toHaveBeenCalledWith('i18n_saved');
    });

    it('should reject a maturity after saving the feedback', async () => {
        const done = firstValueFrom(service.rejectMaturity$(exam(), true).pipe(toArray()));
        http.expectOne('/app/review/5/comment').flush({ id: 3 });
        const req = http.expectOne('/app/review/5');
        expect(req.request.body.state).toBe('REJECTED');
        req.flush(null);
        await done;
    });

    it('should check locked assessments only when the parent has a feedback setting', async () => {
        expect(await firstValueFrom(service.doesPreviouslyLockedAssessmentsExist$(exam()))).toEqual({
            status: 'nothing',
        });

        const done = firstValueFrom(
            service.doesPreviouslyLockedAssessmentsExist$(
                exam({ parent: { id: 1, examFeedbackConfig: {} } as Exam['parent'] }),
            ),
        );
        http.expectOne('/app/review/1/locked').flush({ status: 'everything' });
        expect(await done).toEqual({ status: 'everything' });
    });
});
