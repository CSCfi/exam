// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, Subject } from 'rxjs';
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { vi } from 'vitest';
import type { Reservation } from './reservation.model';
import { ReservationService, type Selection } from './reservation.service';

describe('ReservationService', () => {
    let service: ReservationService;
    let httpMock: HttpTestingController;
    let modalResultSubject: Subject<unknown>;
    let mockModalRef: { componentInstance: { reservation: Reservation | null }; result: Subject<unknown> };

    beforeEach(() => {
        modalResultSubject = new Subject<unknown>();
        mockModalRef = {
            componentInstance: { reservation: null },
            result: modalResultSubject,
        };
        const modalSpy = {
            openRef: vi.fn(() => mockModalRef),
            result$: vi.fn(<T>(ref: { result: Subject<T> }) => ref.result),
        };
        TestBed.configureTestingModule({
            providers: [
                ReservationService,
                { provide: ModalService, useValue: modalSpy },
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(ReservationService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
        vi.useRealTimers();
        TestBed.resetTestingModule();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('printExamState', () => {
        it('should return NO_SHOW when enrolment.noShow is true', () => {
            const r = {
                enrolment: { noShow: true, exam: { state: 'GRADED' }, collaborativeExam: { state: 'PUBLISHED' } },
            };
            expect(service.printExamState(r)).toBe('NO_SHOW');
        });

        it('should return exam.state when enrolment has exam', () => {
            const r = {
                enrolment: { noShow: false, exam: { state: 'GRADED' }, collaborativeExam: { state: 'PUBLISHED' } },
            };
            expect(service.printExamState(r)).toBe('GRADED');
        });

        it('should return collaborativeExam.state when enrolment has no exam', () => {
            const r = {
                enrolment: {
                    noShow: false,
                    exam: null as unknown as { state: string },
                    collaborativeExam: { state: 'PUBLISHED' },
                },
            };
            expect(service.printExamState(r)).toBe('PUBLISHED');
        });
    });

    describe('getReservationCount', () => {
        it('should count enrolments with future reservation endAt', () => {
            const future = new Date();
            future.setFullYear(future.getFullYear() + 1);
            const exam = {
                examEnrolments: [{ reservation: { endAt: future.toISOString() } }, { reservation: null }],
            } as unknown as Exam;
            expect(service.getReservationCount(exam)).toBe(1);
        });

        it('should count enrolments with future examinationEvent start', () => {
            const future = new Date();
            future.setFullYear(future.getFullYear() + 1);
            const exam = {
                examEnrolments: [
                    {},
                    {
                        examinationEventConfiguration: {
                            examinationEvent: { start: future.toISOString() },
                        },
                    },
                ],
            } as unknown as Exam;
            expect(service.getReservationCount(exam)).toBe(1);
        });

        it('should not count enrolments with past reservation', () => {
            const past = new Date();
            past.setFullYear(past.getFullYear() - 1);
            const exam = {
                examEnrolments: [{ reservation: { endAt: past.toISOString() } }],
            } as unknown as Exam;
            expect(service.getReservationCount(exam)).toBe(0);
        });
    });

    describe('changeMachine', () => {
        it('should open change-machine dialog and update reservation when result is returned', () => {
            const modalService = TestBed.inject(ModalService) as unknown as {
                openRef: ReturnType<typeof vi.fn>;
                result$: ReturnType<typeof vi.fn>;
            };
            const reservation = {
                machine: { name: 'old' },
                startAt: 'oldStart',
                endAt: 'oldEnd',
            } as unknown as Reservation;
            service.changeMachine(reservation);
            expect(modalService.openRef).toHaveBeenCalled();
            expect(mockModalRef.componentInstance.reservation).toBe(reservation);
            // Service subscribes to result$(ref); our mock returns ref.result (modalResultSubject)
            modalResultSubject.next({
                machine: { name: 'new' },
                startAt: 'newStart',
                endAt: 'newEnd',
            });
            expect(reservation.machine).toEqual({ name: 'new' });
            expect(reservation.startAt).toBe('newStart');
            expect(reservation.endAt).toBe('newEnd');
        });
    });

    describe('cancelReservation$', () => {
        it('should open remove-reservation dialog and return modal result$', async () => {
            const reservation = {} as Reservation;
            const resultPromise = firstValueFrom(service.cancelReservation$(reservation));
            modalResultSubject.next(undefined);
            await resultPromise;
            expect(
                (TestBed.inject(ModalService) as unknown as { openRef: ReturnType<typeof vi.fn> }).openRef,
            ).toHaveBeenCalled();
        });
    });

    describe('listReservations$', () => {
        const baseReservation = {
            id: 1,
            user: {
                id: 1,
                firstName: 'Jane',
                lastName: 'Doe',
                eppn: '',
                email: '',
                lang: '',
                loginRole: null,
                roles: [],
                userAgreementAccepted: true,
            },
            machine: {
                id: 1,
                name: 'M1',
                room: {} as never,
                outOfService: false,
                archived: false,
                softwareInfo: [],
                otherIdentifier: '',
                accessibilityInfo: '',
                accessible: true,
                surveillanceCamera: '',
                videoRecordings: '',
                ipAddress: '',
            },
            startAt: '2025-06-01T10:00:00Z',
            endAt: '2025-06-01T12:00:00Z',
            enrolment: {
                id: 1,
                noShow: false,
                exam: {
                    id: 10,
                    examOwners: [
                        {
                            id: 1,
                            firstName: 'T',
                            lastName: 'E',
                            eppn: '',
                            email: '',
                            lang: '',
                            loginRole: null,
                            roles: [],
                            userAgreementAccepted: true,
                        },
                    ],
                    parent: null,
                } as unknown as ExamEnrolment['exam'],
                user: {} as never,
                collaborativeExam: null as never,
                reservationCanceled: false,
                optionalSections: [],
                delay: 0,
                information: '',
                retrialPermitted: false,
            } as ExamEnrolment,
        } as unknown as Reservation;

        it('should fetch reservations and events and merge with userAggregate and stateOrd', async () => {
            const params: Selection = {};
            const resultPromise = firstValueFrom(service.listReservations$(params));
            const reservationsReq = httpMock.expectOne((req) => req.url === '/app/reservations');
            const eventsReq = httpMock.expectOne((req) => req.url === '/app/events');
            expect(reservationsReq.request.params.keys().length).toBe(0);
            reservationsReq.flush([baseReservation]);
            eventsReq.flush([]);
            const result = await resultPromise;
            expect(result.length).toBe(1);
            expect(result[0].userAggregate).toBe('Doe  Jane');
            expect(typeof result[0].stateOrd).toBe('number');
        });

        it('should not fetch events when roomId is in params', async () => {
            const params: Selection = { roomId: '1' };
            const resultPromise = firstValueFrom(service.listReservations$(params));
            const reservationsReq = httpMock.expectOne((r) => r.url === '/app/reservations');
            httpMock.expectNone((r) => r.url === '/app/events');
            reservationsReq.flush([baseReservation]);
            await resultPromise;
        });

        it('should not fetch events when state starts with EXTERNAL_', async () => {
            const params: Selection = { state: 'EXTERNAL_FINISHED' };
            const resultPromise = firstValueFrom(service.listReservations$(params));
            const reservationsReq = httpMock.expectOne((r) => r.url === '/app/reservations');
            httpMock.expectNone((r) => r.url === '/app/events');
            reservationsReq.flush([baseReservation]);
            await resultPromise;
        });

        it('should filter out reservations without enrolment.exam', async () => {
            const withExam = {
                ...baseReservation,
                enrolment: { ...baseReservation.enrolment, exam: { id: 1, examOwners: [], parent: null } as never },
            };
            const withoutExam = {
                ...baseReservation,
                id: 2,
                enrolment: { ...baseReservation.enrolment, exam: null as never },
            };
            const params: Selection = { roomId: '1' };
            const resultPromise = firstValueFrom(service.listReservations$(params));
            const req = httpMock.expectOne((r) => r.url === '/app/reservations');
            req.flush([withExam, withoutExam]);
            const result = await resultPromise;
            expect(result.length).toBe(1);
            expect(result[0].id).toBe(1);
        });
    });

    describe('searchStudents$', () => {
        it('should not call API for term length < 2', async () => {
            vi.useFakeTimers();
            const sub = service.searchStudents$(of('x')).subscribe();
            vi.advanceTimersByTime(350);
            sub.unsubscribe();
            vi.useRealTimers();
            httpMock.expectNone((r) => r.url === '/app/reservations/students');
        });

        it('should call API and return sorted students limited to 100', async () => {
            vi.useFakeTimers();
            const users = [
                {
                    id: 1,
                    firstName: 'Bob',
                    lastName: 'A',
                    eppn: '',
                    email: '',
                    lang: '',
                    loginRole: null,
                    roles: [],
                    userAgreementAccepted: true,
                    name: 'Bob A',
                },
                {
                    id: 2,
                    firstName: 'Alice',
                    lastName: 'B',
                    eppn: '',
                    email: '',
                    lang: '',
                    loginRole: null,
                    roles: [],
                    userAgreementAccepted: true,
                    name: 'Alice B',
                },
            ];
            const resultPromise = firstValueFrom(service.searchStudents$(of('al')));
            vi.advanceTimersByTime(350);
            const req = httpMock.expectOne(
                (r) => r.url === '/app/reservations/students' && r.params.get('filter') === 'al',
            );
            req.flush(users);
            const result = await resultPromise;
            vi.useRealTimers();
            expect(result[0].firstName).toBe('Alice');
            expect(result[1].firstName).toBe('Bob');
            expect(result.length).toBe(2);
        });
    });

    describe('searchOwners$', () => {
        it('should not call API for term length < 2', async () => {
            vi.useFakeTimers();
            const sub = service.searchOwners$(of('x')).subscribe();
            vi.advanceTimersByTime(350);
            sub.unsubscribe();
            vi.useRealTimers();
            httpMock.expectNone((r) => r.url === '/app/reservations/teachers');
        });

        it('should call API and return sorted by lastName, limited to 100', async () => {
            vi.useFakeTimers();
            const users = [
                {
                    id: 1,
                    firstName: 'A',
                    lastName: 'Zee',
                    eppn: '',
                    email: '',
                    lang: '',
                    loginRole: null,
                    roles: [],
                    userAgreementAccepted: true,
                    name: 'A Zee',
                },
                {
                    id: 2,
                    firstName: 'B',
                    lastName: 'Alpha',
                    eppn: '',
                    email: '',
                    lang: '',
                    loginRole: null,
                    roles: [],
                    userAgreementAccepted: true,
                    name: 'B Alpha',
                },
            ];
            const resultPromise = firstValueFrom(service.searchOwners$(of('te')));
            vi.advanceTimersByTime(350);
            const req = httpMock.expectOne(
                (r) => r.url === '/app/reservations/teachers' && r.params.get('filter') === 'te',
            );
            req.flush(users);
            const result = await resultPromise;
            vi.useRealTimers();
            expect(result[0].lastName).toBe('Alpha');
            expect(result[1].lastName).toBe('Zee');
        });
    });

    describe('searchExams$', () => {
        it('should not call API for term length < 2', async () => {
            vi.useFakeTimers();
            const sub = service.searchExams$(of('x')).subscribe();
            vi.advanceTimersByTime(350);
            sub.unsubscribe();
            vi.useRealTimers();
            httpMock.expectNone((r) => r.url === '/app/reservations/exams');
        });

        it('should fetch exams only from reservations when includeCollaboratives is false', async () => {
            vi.useFakeTimers();
            const exams = [{ id: 1, name: 'Exam A' }];
            const resultPromise = firstValueFrom(service.searchExams$(of('ex'), false));
            vi.advanceTimersByTime(350);
            const req = httpMock.expectOne(
                (r) => r.url === '/app/reservations/exams' && r.params.get('filter') === 'ex',
            );
            req.flush(exams);
            const result = await resultPromise;
            vi.useRealTimers();
            httpMock.expectNone('/app/iop/exams');
            expect(result.length).toBe(1);
            expect((result[0] as { name: string }).name).toBe('Exam A');
        });

        it('should fetch exams and collaborative exams when includeCollaboratives is true', async () => {
            vi.useFakeTimers();
            const exams = [{ id: 1, name: 'Exam A' }];
            const collaborativeExams = [{ id: 2, name: 'Collab B' }];
            const resultPromise = firstValueFrom(service.searchExams$(of('ex'), true));
            vi.advanceTimersByTime(350);
            const reqRes = httpMock.expectOne((r) => r.url === '/app/reservations/exams');
            const reqIop = httpMock.expectOne((r) => r.url === '/app/iop/exams');
            reqRes.flush(exams);
            reqIop.flush(collaborativeExams);
            const result = await resultPromise;
            vi.useRealTimers();
            expect(result.length).toBe(2);
            const names = (result as { name: string }[]).map((e) => e.name).sort();
            expect(names).toEqual(['Collab B', 'Exam A']);
        });
    });
});
