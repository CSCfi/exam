// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { Observable } from 'rxjs';
import { EMPTY, of } from 'rxjs';
import type { EnrolmentInfo, ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';
import { errorInterceptor } from 'src/app/interceptors/error.interceptor';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { EnrolmentService } from './enrolment.service';

const exam = (overrides: Record<string, unknown> = {}) =>
    ({
        id: 5,
        hash: 'h5',
        implementation: 'AQUARIUM',
        course: { code: 'MAT1' },
        executionType: { type: 'PUBLIC' },
        examLanguages: [{ code: 'fi', name: 'suomi' }],
        examinationEventConfigurations: [],
        ...overrides,
    }) as unknown as Exam;

const enrolment = (overrides: Record<string, unknown> = {}) =>
    ({ id: 9, exam: exam(), ...overrides }) as unknown as ExamEnrolment;

describe('EnrolmentService', () => {
    let service: EnrolmentService;
    let http: HttpTestingController;
    const router = { navigate: vi.fn() };
    const toast = { success: vi.fn(), info: vi.fn(), error: vi.fn() };
    const confirmation = { open$: vi.fn() };
    const dialog = {
        exam: signal<Exam | undefined>(undefined),
        enrolmentId: signal<number | undefined>(undefined),
        existingEventId: signal<number | undefined>(undefined),
        instructions: signal(''),
        title: signal(''),
        information: undefined as string | undefined,
    };
    const modal = {
        openRef: vi.fn(() => ({ componentInstance: dialog })),
        result$: vi.fn<() => Observable<unknown>>(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        confirmation.open$.mockReturnValue(of(true));
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                // As in the app, so that errors arrive as their translated message
                provideHttpClient(withInterceptors([errorInterceptor])),
                provideHttpClientTesting(),
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
                { provide: ConfirmationDialogService, useValue: confirmation },
                { provide: ModalService, useValue: modal },
            ],
        });
        service = TestBed.inject(EnrolmentService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    // Some URLs carry a query string built by hand, which stays in the url
    const req = (method: string, url: string) =>
        http.expectOne((r) => r.method === method && r.url.split('?')[0] === url);

    describe('enrolling', () => {
        it('should enrol with the course code and go on to book a time', () => {
            service.checkAndEnroll$(exam()).subscribe();
            req('GET', '/app/enrolments/exam/5').flush([]);
            const post = req('POST', '/app/enrolments/5');
            expect(post.request.body).toEqual({ code: 'MAT1' });
            post.flush(enrolment());

            expect(toast.success).toHaveBeenCalled();
            expect(router.navigate).toHaveBeenCalledWith(['/calendar', 5]);
        });

        it('should enrol in a collaborative exam through the collaboration', () => {
            service.checkAndEnroll$(exam(), true).subscribe();
            req('GET', '/app/iop/enrolments/exam/5').flush([]);
            req('POST', '/app/iop/enrolments/5').flush(enrolment());
            expect(router.navigate).toHaveBeenCalledWith(['/calendar', 5, 'collaborative']);
        });

        it('should let the student pick an examination event for an exam taken elsewhere than a room', () => {
            const event = { id: 31 };
            modal.result$.mockReturnValue(of(event));
            const byod = exam({ implementation: 'CLIENT_AUTH', examinationEventConfigurations: [event] });

            service.checkAndEnroll$(byod).subscribe();
            req('GET', '/app/enrolments/exam/5').flush([]);
            req('POST', '/app/enrolments/5').flush(enrolment());
            expect(dialog.exam()).toBe(byod);
            expect(dialog.enrolmentId()).toBe(9);
            req('POST', '/app/enrolments/9/examination/31').flush({});

            expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
        });

        it('should offer a time to a student enrolled without one, instead of saying they are enrolled', () => {
            service.checkAndEnroll$(exam()).subscribe();
            req('GET', '/app/enrolments/exam/5').flush([enrolment({ reservation: undefined })]);
            expect(router.navigate).toHaveBeenCalledWith(['/calendar', 5]);
            expect(toast.error).not.toHaveBeenCalled();
        });

        it('should tell a student who already has a time that they are enrolled', () => {
            service.checkAndEnroll$(exam()).subscribe();
            req('GET', '/app/enrolments/exam/5').flush([enrolment({ reservation: { id: 1 } })]);
            expect(toast.error).toHaveBeenCalledWith('i18n_already_enrolled');
            expect(router.navigate).not.toHaveBeenCalled();
        });

        it('should enrol a student on their behalf by id and email', () => {
            service.enrollStudent$(exam(), { id: 3, email: 's@uni.fi' }).subscribe();
            expect(req('POST', '/app/enrolments/student/5').request.body).toEqual({ uid: 3, email: 's@uni.fi' });
        });
    });

    describe('booking a time', () => {
        it('should open the calendar for a room exam, collaborative or not', () => {
            service.makeReservation$(enrolment()).subscribe();
            expect(router.navigate).toHaveBeenLastCalledWith(['/calendar', 5]);
            service.makeReservation$(enrolment({ exam: undefined, collaborativeExam: { id: 77 } })).subscribe();
            expect(router.navigate).toHaveBeenLastCalledWith(['/calendar', 77, 'collaborative']);
        });

        it('should change the examination event, showing the one chosen before', () => {
            modal.result$.mockReturnValue(of({ id: 32 }));
            const e = enrolment({
                exam: exam({ implementation: 'WHATEVER' }),
                examinationEventConfiguration: { id: 31 },
            });
            service.makeReservation$(e).subscribe();
            expect(dialog.existingEventId()).toBe(31);
            req('POST', '/app/enrolments/9/examination/32').flush({});
        });

        it('should tell whether an event is full, from the error message', () => {
            const results: unknown[] = [];
            service.checkExaminationEventConfig$(9, 31).subscribe((r) => results.push(r));
            req('GET', '/app/enrolments/9/examination/31').flush('');
            service.checkExaminationEventConfig$(9, 31).subscribe((r) => results.push(r));
            req('GET', '/app/enrolments/9/examination/31').flush('i18n_error_max_enrolments_reached', {
                status: 403,
                statusText: 'Forbidden',
            });
            service.checkExaminationEventConfig$(9, 31).subscribe((r) => results.push(r));
            req('GET', '/app/enrolments/9/examination/31').flush('i18n_error_past_event', {
                status: 403,
                statusText: 'Forbidden',
            });
            expect(results).toEqual([
                null,
                { full: true, message: 'i18n_error_max_enrolments_reached' },
                { full: false, message: 'i18n_error_past_event' },
            ]);
        });

        it('should know about other upcoming events than the chosen one', () => {
            const future = new Date(Date.now() + 86_400_000).toISOString();
            const past = '2020-01-01T00:00:00Z';
            const withEvents = (...events: { id: number; start: string }[]) =>
                enrolment({
                    exam: exam({
                        examinationEventConfigurations: events.map((e) => ({
                            id: e.id,
                            examinationEvent: { start: e.start },
                        })),
                    }),
                    examinationEventConfiguration: { id: 31 },
                });
            expect(service.hasUpcomingAlternativeEvents(withEvents({ id: 31, start: future }))).toBe(false);
            expect(service.hasUpcomingAlternativeEvents(withEvents({ id: 32, start: past }))).toBe(false);
            expect(service.hasUpcomingAlternativeEvents(withEvents({ id: 32, start: future }))).toBe(true);
        });
    });

    describe('cancelling', () => {
        it('should remove a reservation here, or a visit through XM', () => {
            service.removeReservation$(enrolment({ reservation: { id: 4 } })).subscribe();
            req('DELETE', '/app/calendar/reservation/4').flush(null);
            service.removeReservation$(enrolment({ reservation: { id: 4, externalRef: 'ext-4' } })).subscribe();
            req('DELETE', '/app/iop/reservations/external/ext-4').flush(null);
        });

        it('should remove nothing without a reservation or a confirmation', () => {
            service.removeReservation$(enrolment()).subscribe();
            confirmation.open$.mockReturnValue(EMPTY);
            service.removeReservation$(enrolment({ reservation: { id: 4 } })).subscribe();
            service.removeExaminationEvent$(enrolment()).subscribe();
            http.expectNone(() => true);
        });

        it('should remove the chosen examination event', () => {
            service.removeExaminationEvent$(enrolment()).subscribe();
            req('DELETE', '/app/enrolments/9/examination').flush(null);
            expect(toast.info).toHaveBeenCalledWith('i18n_examination_event_removed');
        });
    });

    describe('the enrolment page', () => {
        it('should note an enrolment and a reservation already made', () => {
            let info: EnrolmentInfo | undefined;
            service.getEnrolmentInfo$('MAT1', 5).subscribe((i) => (info = i));
            const page = req('GET', '/app/enrolments/5');
            expect(page.request.urlWithParams).toBe('/app/enrolments/5?code=MAT1');
            page.flush(exam());
            req('GET', '/app/enrolments/exam/5').flush([enrolment({ reservation: { id: 1 } })]);
            expect(info).toMatchObject({ alreadyEnrolled: true, reservationMade: true, maturityInstructions: '' });
        });

        it('should give a maturity test its instructions in the exam language', () => {
            let instructions = '';
            const maturity = exam({
                executionType: { type: 'MATURITY' },
                examLanguages: [{ code: 'sv', name: 'svenska' }],
            });
            service.getEnrolmentInfo$('MAT1', 5).subscribe((i) => (instructions = i.maturityInstructions as string));
            req('GET', '/app/enrolments/5').flush(maturity);
            const settings = http.expectOne((r) => r.url.startsWith('/app/settings/maturityInstructions'));
            expect(settings.request.urlWithParams).toBe('/app/settings/maturityInstructions?lang=sv');
            settings.flush({ value: 'Write an essay' });
            req('GET', '/app/enrolments/exam/5').flush([]);
            expect(instructions).toBe('Write an essay');
        });

        it('should note that no attempts are left when enrolment is refused', () => {
            let noTrialsLeft = false;
            service.getEnrolmentInfo$('MAT1', 5).subscribe((i) => (noTrialsLeft = i.noTrialsLeft));
            req('GET', '/app/enrolments/5').flush(exam());
            req('GET', '/app/enrolments/exam/5').flush('no trials', { status: 403, statusText: 'Forbidden' });
            expect(noTrialsLeft).toBe(true);
        });

        it("should list the course's other exams, each with its own enrolment state", () => {
            let infos: EnrolmentInfo[] = [];
            service.listEnrolments$('MAT1', 5).subscribe((i) => (infos = i));
            req('GET', '/app/enrolments').flush([exam(), exam({ id: 6 }), exam({ id: 7 })]);
            req('GET', '/app/enrolments/exam/6').flush([enrolment()]);
            req('GET', '/app/enrolments/exam/7').flush('', { status: 500, statusText: 'Error' });
            expect(infos.map((i) => [i.id, i.alreadyEnrolled])).toEqual([
                [6, true],
                [7, false],
            ]);
        });
    });

    describe('after the exam', () => {
        it('should mark the feedback read once', () => {
            const reviewed = { id: 5, examFeedback: { id: 2, feedbackStatus: false } } as unknown as Exam;
            service.setCommentRead(reviewed);
            req('PUT', '/app/review/5/comment/2/feedbackstatus').flush(null);
            expect(reviewed.examFeedback?.feedbackStatus).toBe(true);
            service.setCommentRead(reviewed);
            http.expectNone((r) => r.method === 'PUT');
        });

        it('should save additional information given for an enrolment', () => {
            modal.result$.mockReturnValue(of('Need a quiet room'));
            let saved = '';
            service.addEnrolmentInformation$(enrolment({ information: 'old' })).subscribe((i) => (saved = i));
            expect(dialog.information).toBe('old');
            const put = req('PUT', '/app/enrolments/9');
            expect(put.request.body).toEqual({ information: 'Need a quiet room' });
            put.flush(null);
            expect(saved).toBe('Need a quiet room');
        });
    });
});
