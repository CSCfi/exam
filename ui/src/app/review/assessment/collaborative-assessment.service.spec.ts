// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom, of } from 'rxjs';
import type { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';
import { errorInterceptor } from 'src/app/interceptors/error.interceptor';
import { SessionService } from 'src/app/session/session.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { CollaborativeAssesmentService } from './collaborative-assessment.service';

describe('CollaborativeAssesmentService', () => {
    let service: CollaborativeAssesmentService;
    let http: HttpTestingController;
    const toast = { info: vi.fn(), warning: vi.fn(), error: vi.fn() };
    const router = { navigate: vi.fn() };
    const dialogs = { open$: vi.fn(() => of(true)) };
    const exitTo = [['/staff/exams', '7', '5'], { queryParams: { collaborative: true } }];

    const participation = (exam: Partial<Exam> = {}) =>
        ({
            _id: 'abc',
            _rev: '1-a',
            exam: {
                id: 5,
                state: 'REVIEW_STARTED',
                grade: { id: 11, name: '5' },
                gradingType: 'GRADED',
                customCredit: 5,
                creditType: { type: 'FINAL' },
                answerLanguage: 'fi',
                examFeedback: { comment: 'Good' },
                ...exam,
            },
        }) as unknown as ExamParticipation;

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideHttpClient(withInterceptors([errorInterceptor])),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
                { provide: Router, useValue: router },
                { provide: ConfirmationDialogService, useValue: dialogs },
                { provide: SessionService, useValue: { getUser: () => ({ id: 1 }) } },
            ],
        });
        service = TestBed.inject(CollaborativeAssesmentService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('should send the whole grade but none for an ungraded exam', () => {
        const p = participation();
        expect(service.getPayload(p.exam, 'GRADED', '1-a')).toMatchObject({
            grade: { id: 11, name: '5' },
            state: 'GRADED',
            rev: '1-a',
        });
        expect(service.getPayload({ ...p.exam, gradingType: 'NOT_GRADED' }, 'GRADED', '1-a').grade).toBeUndefined();
    });

    it('should save feedback and keep the new revision', async () => {
        const p = participation();

        const done = firstValueFrom(service.saveFeedback$(7, 'abc', p));
        const req = http.expectOne('/app/iop/reviews/7/abc/comment');
        expect(req.request.body).toEqual({ rev: '1-a', comment: 'Good' });
        req.flush({ rev: '2-b' });
        await done;

        expect(p._rev).toBe('2-b');
    });

    it('should save assessment info only for a recorded review', async () => {
        const p = participation({ state: 'GRADED_LOGGED', assessmentInfo: 'x' });

        expect(await firstValueFrom(service.saveAssessmentInfo$(7, 'abc', participation()))).toBeDefined();
        const done = firstValueFrom(service.saveAssessmentInfo$(7, 'abc', p));
        http.expectOne('/app/iop/reviews/7/abc/info').flush({ rev: '2-b' });

        expect((await done)._rev).toBe('2-b');
    });

    describe('saving the assessment', () => {
        it('should grade after confirmation, passing the revision along', () => {
            const p = participation();

            service.saveAssessment(p, true, 7, 'abc');
            const review = http.expectOne('/app/iop/reviews/7/abc');
            expect(review.request.body).toMatchObject({ state: 'GRADED', rev: '1-a' });
            review.flush({ rev: '2-b' });
            const comment = http.expectOne('/app/iop/reviews/7/abc/comment');
            expect(comment.request.body.rev).toBe('2-b');
            comment.flush({ rev: '3-c' });

            expect(p._rev).toBe('3-c');
            expect(router.navigate).toHaveBeenCalledWith(...exitTo);
        });

        it('should show why saving failed', () => {
            service.saveAssessment(participation({ answerLanguage: undefined }), true, 7, 'abc');
            http.expectOne('/app/iop/reviews/7/abc').flush('i18n_error_access_forbidden', {
                status: 403,
                statusText: 'Forbidden',
            });

            expect(toast.error).toHaveBeenCalledWith('i18n_error_access_forbidden');
        });
    });

    describe('recording', () => {
        it('should save, grade and record with the latest revision each time', () => {
            const p = participation();

            service.createExamRecord(p, 7, 'abc');
            http.expectOne('/app/iop/reviews/7/abc/comment').flush({ rev: '2-b' });
            const review = http.expectOne('/app/iop/reviews/7/abc');
            expect(review.request.body.rev).toBe('2-b');
            review.flush({ rev: '3-c' });
            const record = http.expectOne('/app/iop/reviews/7/abc/record');
            expect(record.request.body).toMatchObject({ state: 'GRADED_LOGGED', rev: '3-c' });
            record.flush({ rev: '4-d' });

            expect(p._rev).toBe('4-d');
            expect(toast.info).toHaveBeenCalledWith('i18n_review_recorded');
            expect(router.navigate).toHaveBeenCalledWith(...exitTo);
        });

        it('should not record an incomplete review', () => {
            service.createExamRecord(participation({ creditType: undefined }), 7, 'abc');

            expect(dialogs.open$).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith('i18n_exam_choose_credit_type');
        });
    });
});
