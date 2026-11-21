// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import type { Exam } from 'src/app/exam/exam.model';
import { errorInterceptor } from 'src/app/interceptors/error.interceptor';
import { SessionService } from 'src/app/session/session.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { MaturityService, StateName } from './maturity.service';

describe('MaturityService', () => {
    let service: MaturityService;
    let http: HttpTestingController;
    const toast = { info: vi.fn(), warning: vi.fn(), error: vi.fn() };
    const router = { navigate: vi.fn() };
    const dialogs = { open$: vi.fn(() => of(true)) };
    let user: { id: number; isAdmin: boolean; isLanguageInspector: boolean };

    const exam = (overrides: Partial<Exam> = {}): Exam =>
        ({
            id: 5,
            state: 'REVIEW_STARTED',
            parent: { id: 1 },
            grade: { id: 11, name: '5', marksRejection: false },
            gradingType: 'GRADED',
            customCredit: 5,
            creditType: { type: 'FINAL' },
            answerLanguage: 'fi',
            examLanguages: [],
            examFeedback: { id: 3, comment: 'Content is fine' },
            executionType: { type: 'MATURITY' },
            ...overrides,
        }) as unknown as Exam;

    const inspection = (comment = 'Language is fine', finishedAt?: string) =>
        ({ id: 4, finishedAt, statement: { id: 6, comment } }) as unknown as Exam['languageInspection'];

    beforeEach(() => {
        vi.clearAllMocks();
        user = { id: 1, isAdmin: false, isLanguageInspector: false };
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
        service = TestBed.inject(MaturityService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    describe('next state', () => {
        const next = (e: Exam) => service.getNextState(e).name;

        it('should wait for a grade first', () => {
            expect(next(exam({ grade: undefined }))).toBe(StateName.NOT_REVIEWED);
        });

        it('should require the content statement', () => {
            expect(next(exam({ examFeedback: { comment: '' } as Exam['examFeedback'] }))).toBe(
                StateName.MISSING_STATEMENT,
            );
        });

        it('should send an approved maturity to language inspection', () => {
            expect(next(exam())).toBe(StateName.LANGUAGE_INSPECT);
        });

        it('should reject a failed maturity straight away', () => {
            expect(next(exam({ grade: { id: 10, name: '0', marksRejection: true } as Exam['grade'] }))).toBe(
                StateName.REJECT_STRAIGHTAWAY,
            );
        });

        it('should wait while the inspection is ongoing', () => {
            expect(next(exam({ languageInspection: inspection() }))).toBe(StateName.AWAIT_INSPECTION);
        });

        it('should let the language inspector decide', () => {
            user.isLanguageInspector = true;
            const state = service.getNextState(exam({ languageInspection: inspection() }));

            expect(state.name).toBe(StateName.APPROVE_LANGUAGE);
            expect(state.alternateState).toBe(StateName.REJECT_LANGUAGE);
            expect(state.validate?.(exam({ languageInspection: inspection() }))).toBe(true);
            expect(state.validate?.(exam({ languageInspection: inspection('') }))).toBe(false);
        });
    });

    it('should hint what is missing', () => {
        expect(service.resolveHint(exam({ grade: undefined, examFeedback: undefined }))).toBe(
            'i18n_not_reviewed, i18n_missing_content_statement',
        );
        expect(service.resolveHint(exam({ examFeedback: undefined }))).toBe('i18n_missing_content_statement');
        expect(service.resolveHint(exam({ grade: undefined }))).toBe('i18n_not_reviewed');
        expect(service.resolveHint(exam())).toBe('');
    });

    it('should ask for the language statement from an inspector', () => {
        user.isLanguageInspector = true;
        expect(service.isMissingStatement(exam({ languageInspection: inspection('') }))).toBe(true);
        expect(service.isMissingStatement(exam({ languageInspection: inspection() }))).toBe(false);
    });

    it('should send to language inspection after confirmation', () => {
        service.proceed(exam(), false);

        http.expectOne('/app/review/5/comment').flush({ id: 3 });
        const review = http.expectOne('/app/review/5');
        expect(review.request.body.state).toBe('GRADED');
        review.flush({});
        const req = http.expectOne('/app/inspection');
        expect(req.request.body).toEqual({ examId: 5 });
        req.flush({});

        expect(toast.info).toHaveBeenCalledWith('i18n_sent_for_language_inspection');
        expect(router.navigate).toHaveBeenCalledWith(['/staff/exams', '1', '5'], {
            queryParams: { collaborative: false },
        });
    });

    it('should show why sending to inspection failed', () => {
        service.proceed(exam(), false);

        http.expectOne('/app/review/5/comment').flush('i18n_error_access_forbidden', {
            status: 403,
            statusText: 'Forbidden',
        });

        expect(toast.error).toHaveBeenCalledWith('i18n_error_access_forbidden');
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should reject straight away', () => {
        service.proceed(exam({ grade: { id: 10, name: '0', marksRejection: true } as Exam['grade'] }), false);

        http.expectOne('/app/review/5/comment').flush({ id: 3 });
        const req = http.expectOne('/app/review/5');
        expect(req.request.body.state).toBe('REJECTED');
        req.flush(null);

        expect(toast.info).toHaveBeenCalledWith('i18n_maturity_rejected');
    });

    describe('finishing the language inspection', () => {
        beforeEach(() => (user.isLanguageInspector = true));

        it('should approve and record the maturity', () => {
            service.proceed(exam({ state: 'GRADED', languageInspection: inspection() }), false);

            const statement = http.expectOne('/app/inspection/4/statement');
            expect(statement.request.body).toEqual({ id: 4, comment: 'Language is fine' });
            statement.flush({ id: 6 });
            const approval = http.expectOne('/app/inspection/4/approval');
            expect(approval.request.body).toEqual({ approved: true });
            approval.flush(null);
            const record = http.expectOne('/app/exam/record');
            expect(record.request.body.state).toBe('GRADED_LOGGED');
            record.flush(null);

            expect(toast.info).toHaveBeenCalledWith('i18n_review_recorded');
            expect(router.navigate).toHaveBeenCalledWith(['/staff/inspections']);
        });

        it('should reject the language when asked to', () => {
            service.proceed(exam({ state: 'GRADED', languageInspection: inspection() }), true);

            http.expectOne('/app/inspection/4/statement').flush({ id: 6 });
            const approval = http.expectOne('/app/inspection/4/approval');
            expect(approval.request.body).toEqual({ approved: false });
            approval.flush(null);
            http.expectOne('/app/review/5/comment').flush({ id: 3 });
            expect(http.expectOne('/app/review/5').request.body.state).toBe('REJECTED');
        });

        it('should show why finishing failed', () => {
            service.proceed(exam({ state: 'GRADED', languageInspection: inspection() }), false);

            http.expectOne('/app/inspection/4/statement').flush('i18n_error_access_forbidden', {
                status: 403,
                statusText: 'Forbidden',
            });

            expect(toast.error).toHaveBeenCalledWith('i18n_error_access_forbidden');
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });
});
