// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import type { ExamRoom, ExceptionWorkingHours } from 'src/app/reservation/reservation.model';
import { SessionService } from 'src/app/session/session.service';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
    let service: CalendarService;
    let http: HttpTestingController;

    const tz = 'Europe/Helsinki';
    // Week 24 of 2030, Monday to Sunday
    const weekStart = '2030-06-10T00:00:00.000+03:00';
    const weekEnd = '2030-06-16T23:59:59.999+03:00';

    const hours = (weekday: string, start: string, end: string) => ({
        weekday,
        startTime: `2030-01-07T${start}:00+02:00`,
        endTime: `2030-01-07T${end}:00+02:00`,
    });
    const exception = (startDate: string, endDate: string, outOfService = false) =>
        ({ id: 1, startDate, endDate, outOfService }) as ExceptionWorkingHours;
    const room = (exceptions: ExceptionWorkingHours[] = []) =>
        ({
            id: 3,
            localTimezone: tz,
            defaultWorkingHours: [
                hours('TUESDAY', '12:00', '16:00'),
                hours('MONDAY', '08:00', '16:00'),
                hours('MONDAY', '17:00', '20:00'),
            ],
            calendarExceptionEvents: exceptions,
        }) as unknown as ExamRoom;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: SessionService, useValue: { getUser: () => ({ lang: 'en' }) } },
            ],
        });
        service = TestBed.inject(CalendarService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('should group opening hours by weekday in week order', () => {
        expect(service.processOpeningHours(room()).map((oh) => [oh.ref, oh.periodText])).toEqual([
            ['MONDAY', '08:00 - 16:00, 17:00 - 20:00'],
            ['TUESDAY', '12:00 - 16:00'],
        ]);
    });

    describe('closed weekdays', () => {
        it('should hide the days without opening hours', () => {
            expect(service.getClosedWeekdays(room(), weekStart, weekEnd)).toEqual([0, 3, 4, 5, 6]);
        });

        it('should show a day with an extra opening that week', () => {
            const saturday = exception('2030-06-15T08:00:00+03:00', '2030-06-15T12:00:00+03:00');
            expect(service.getClosedWeekdays(room([saturday]), weekStart, weekEnd)).toEqual([0, 3, 4, 5]);
        });

        it('should ignore an extra opening of the same week number in another year', () => {
            const saturday = exception('2029-06-16T08:00:00+03:00', '2029-06-16T12:00:00+03:00');
            expect(service.getClosedWeekdays(room([saturday]), weekStart, weekEnd)).toEqual([0, 3, 4, 5, 6]);
        });

        it('should show the day of an extra opening in room time', () => {
            // Friday 22:00 UTC is Saturday 01:00 in the room
            const saturday = exception('2030-06-14T22:00:00Z', '2030-06-14T23:30:00Z');
            expect(service.getClosedWeekdays(room([saturday]), weekStart, weekEnd)).toEqual([0, 3, 4, 5]);
        });

        it('should ignore days out of service', () => {
            const saturday = exception('2030-06-15T08:00:00+03:00', '2030-06-15T12:00:00+03:00', true);
            expect(service.getClosedWeekdays(room([saturday]), weekStart, weekEnd)).toContain(6);
        });
    });

    describe('visible hours', () => {
        it('should span the regular opening hours', () => {
            expect(service.getEarliestOpening(room(), weekStart, weekEnd).getHours()).toBe(8);
            expect(service.getLatestClosing(room(), weekStart, weekEnd).getHours()).toBe(20);
        });

        it('should stretch to an extra opening that week, in room time', () => {
            const early = exception('2030-06-12T03:00:00Z', '2030-06-12T19:00:00Z');

            expect(service.getEarliestOpening(room([early]), weekStart, weekEnd).getHours()).toBe(6);
            expect(service.getLatestClosing(room([early]), weekStart, weekEnd).getHours()).toBe(22);
        });

        it('should show the whole day around a multi-day opening that week', () => {
            const overnight = exception('2030-06-12T20:00:00+03:00', '2030-06-13T04:00:00+03:00');

            expect(service.getEarliestOpening(room([overnight]), weekStart, weekEnd).getHours()).toBe(0);
            expect(service.getLatestClosing(room([overnight]), weekStart, weekEnd).getHours()).toBe(23);
        });

        it('should not do so for a multi-day opening in another year', () => {
            const overnight = exception('2029-06-13T20:00:00+03:00', '2029-06-14T04:00:00+03:00');

            expect(service.getEarliestOpening(room([overnight]), weekStart, weekEnd).getHours()).toBe(8);
        });
    });

    it('should list only upcoming exceptions within the range in the room zone', () => {
        const past = exception('2020-06-12T08:00:00Z', '2020-06-12T10:00:00Z');
        const future = exception('2099-06-12T08:00:00Z', '2099-06-12T10:00:00Z', true);
        const r = room([past, future]);

        const result = service.getExceptionHours(r, DateTime.fromISO('2020-01-01'), DateTime.fromISO('2100-01-01'));

        expect(result).toEqual([
            expect.objectContaining({
                start: '12.06.2099 11:00',
                end: '12.06.2099 13:00',
                description: 'i18n_room_out_of_service',
            }),
        ]);
    });

    describe('reserving', () => {
        const start = DateTime.fromISO('2030-06-12T10:00:00', { zone: tz });
        const end = start.plus({ hours: 2 });

        it('should reserve a local room in UTC with the chosen aids and sections', () => {
            service.reserve$(5, start, end, room(), [{ id: 4, name: 'Aid' }], { _id: null }, false, [7]).subscribe();

            const req = http.expectOne('/app/calendar/reservation');
            expect(req.request.body).toEqual({
                start: '2030-06-12T07:00:00.000Z',
                end: '2030-06-12T09:00:00.000Z',
                examId: 5,
                roomId: 3,
                orgId: null,
                sectionIds: [7],
                aids: [4],
            });
            req.flush(null);
        });

        it('should reserve a room of another organisation through IOP', () => {
            const remote = { ...room(), _id: 'facility-1' } as ExamRoom;

            service.reserve$(5, start, end, remote, [], { _id: 'org-1' }).subscribe();
            const req = http.expectOne('/app/iop/reservations/external');
            expect(req.request.body).toMatchObject({ roomId: 'facility-1', orgId: 'org-1' });
            req.flush(null);

            service.reserve$(5, start, end, remote, [], { _id: 'org-1' }, true).subscribe();
            http.expectOne('/app/iop/calendar/external/reservation').flush(null);
        });

        it('should reserve a collaborative exam locally', () => {
            service.reserve$(5, start, end, room(), [], { _id: null }, true).subscribe();
            http.expectOne('/app/iop/calendar/reservation').flush(null);
        });
    });

    it('should ask slots from the right place', () => {
        const params = new HttpParams();
        const remote = { ...room(), _id: 'facility-1' } as ExamRoom;

        service.listSlots$(false, false, room(), 5, params).subscribe();
        service.listSlots$(false, true, room(), 5, params).subscribe();
        service.listSlots$(true, false, remote, 5, params).subscribe();
        service.listSlots$(true, true, remote, 5, params).subscribe();

        http.expectOne('/app/calendar/5/3').flush([]);
        http.expectOne('/app/iop/exams/5/calendar/3').flush([]);
        http.expectOne('/app/iop/calendar/5/facility-1').flush([]);
        http.expectOne('/app/iop/exams/5/external/calendar/facility-1').flush([]);
    });
});
