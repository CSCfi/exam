// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime, Interval } from 'luxon';
import type { Observable } from 'rxjs';
import { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { MaintenancePeriod } from 'src/app/facility/facility.model';
import type {
    Accessibility,
    DefaultWorkingHours,
    ExamRoom,
    ExceptionWorkingHours,
} from 'src/app/reservation/reservation.model';
import { SessionService } from 'src/app/session/session.service';
import { DateTimeService } from 'src/app/shared/date/date.service';
import { AvailableSlot, ExamInfo, OpeningHours, Organisation, Slot } from './calendar.model';

type WeekdayNames = Record<string, { ord: number; name: string }>;

@Injectable({ providedIn: 'root' })
export class CalendarService {
    constructor(
        private http: HttpClient,
        private DateTimeService: DateTimeService,
        private Session: SessionService,
    ) {}

    reserve$(
        examId: number,
        start: DateTime,
        end: DateTime,
        room: ExamRoom,
        accs: Accessibility[],
        org: { _id: string | null },
        collaborative = false,
        sectionIds: number[] = [],
    ) {
        const slot: Slot = {
            start: this.adjustBack(start),
            end: this.adjustBack(end),
            examId: examId,
            roomId: room._id ? room._id : room.id,
            orgId: org._id,
            sectionIds: sectionIds,
        };
        if (org._id !== null) {
            return this.reserveExternal$(slot, collaborative);
        } else {
            return this.reserveInternal$(slot, accs, collaborative);
        }
    }

    getWeekdayNames(): WeekdayNames {
        const lang = this.Session.getUser().lang;
        const locale = lang.toLowerCase() + '-' + lang.toUpperCase();
        const options: Intl.DateTimeFormatOptions = { weekday: 'short' };
        const weekday = this.DateTimeService.getDateForWeekday;
        return {
            SUNDAY: { ord: 7, name: weekday(0).toLocaleDateString(locale, options) },
            MONDAY: { ord: 1, name: weekday(1).toLocaleDateString(locale, options) },
            TUESDAY: { ord: 2, name: weekday(2).toLocaleDateString(locale, options) },
            WEDNESDAY: { ord: 3, name: weekday(3).toLocaleDateString(locale, options) },
            THURSDAY: { ord: 4, name: weekday(4).toLocaleDateString(locale, options) },
            FRIDAY: { ord: 5, name: weekday(5).toLocaleDateString(locale, options) },
            SATURDAY: { ord: 6, name: weekday(6).toLocaleDateString(locale, options) },
        };
    }

    processOpeningHours(room: ExamRoom): OpeningHours[] {
        const weekdayNames = this.getWeekdayNames();
        const openingHours: OpeningHours[] = [];
        const tz = room.localTimezone;

        room.defaultWorkingHours.forEach((dwh) => {
            if (!this.findOpeningHours(dwh, openingHours)) {
                const obj = {
                    name: weekdayNames[dwh.weekday].name,
                    ref: dwh.weekday,
                    ord: weekdayNames[dwh.weekday].ord,
                    periods: [],
                };
                openingHours.push(obj);
            }
            const hours = this.findOpeningHours(dwh, openingHours);
            if (hours) {
                const start = DateTime.fromISO(dwh.startTime, { zone: tz }).toLocaleString(DateTime.TIME_24_SIMPLE);
                const end = DateTime.fromISO(dwh.endTime, { zone: tz }).toLocaleString(DateTime.TIME_24_SIMPLE);
                hours.periods.push(`${start} - ${end}`);
            }
        });
        openingHours.forEach((oh) => {
            oh.periodText = oh.periods.sort().join(', ');
        });
        return openingHours.sort((a, b) => a.ord - b.ord);
    }

    listMaintenancePeriods$ = () => this.http.get<MaintenancePeriod[]>('/app/maintenance');

    getExceptionHours(
        room: ExamRoom,
        start: DateTime,
        end: DateTime,
    ): (ExceptionWorkingHours & { start: string; end: string; description: string })[] {
        const maxStart = [DateTime.now().setZone(room.localTimezone), start].reduce((a, b) => (a > b ? a : b));
        const events = room.calendarExceptionEvents.filter(
            (e) =>
                DateTime.fromISO(e.startDate, { zone: room.localTimezone }) > maxStart &&
                DateTime.fromISO(e.endDate, { zone: room.localTimezone }) < end,
        );
        return events.map((e) => this.formatExceptionEvent(e, room.localTimezone));
    }

    getExceptionalAvailability(
        room: ExamRoom,
    ): (ExceptionWorkingHours & { start: string; end: string; description: string })[] {
        return room.calendarExceptionEvents.map((e) => this.formatExceptionEvent(e, room.localTimezone));
    }

    getEarliestOpening(room: ExamRoom, start: string, end: string): Date {
        const dayBegins = DateTime.now().startOf('day').toJSDate();
        // if we have an extra opening that spans midnight then it's 24h
        if (this.hasMultiDayExceptionalOpeningDuring(room.calendarExceptionEvents, start, end)) {
            return dayBegins;
        }
        const tz = room.localTimezone;
        const regularOpenings = room.defaultWorkingHours.map((dwh) =>
            this.normalize(DateTime.fromISO(dwh.startTime, { zone: tz })),
        );
        const extraOpenings = room.calendarExceptionEvents
            .filter((e) => !e.outOfService && e.startDate >= start && e.endDate <= end)
            .flatMap((d) => this.daysBetween(DateTime.fromISO(d.startDate), DateTime.fromISO(d.endDate)))
            .map((d) => this.normalize(d.start as DateTime));

        return DateTime.min(...regularOpenings.concat(extraOpenings))?.toJSDate() || dayBegins;
    }

    getLatestClosing(room: ExamRoom, start: string, end: string): Date {
        const dayEnds = DateTime.now().endOf('day').toJSDate();
        // if we have an extra opening that spans midnight then it's 24h
        if (this.hasMultiDayExceptionalOpeningDuring(room.calendarExceptionEvents, start, end)) {
            return dayEnds;
        }
        const tz = room.localTimezone;
        const regularClosings = room.defaultWorkingHours.map((dwh) =>
            this.normalize(DateTime.fromISO(dwh.endTime, { zone: tz })),
        );
        const extraClosings = room.calendarExceptionEvents
            .filter((e) => !e.outOfService && e.startDate >= start && e.endDate <= end)
            .flatMap((d) => this.daysBetween(DateTime.fromISO(d.startDate), DateTime.fromISO(d.endDate)))
            .map((d) => this.normalize(d.end as DateTime));

        return DateTime.max(...regularClosings.concat(extraClosings))?.toJSDate() || dayEnds;
    }

    getClosedWeekdays(room: ExamRoom, start: string, end: string): number[] {
        const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const regularDays = room.defaultWorkingHours.map((d) => weekdays.indexOf(d.weekday));
        const extraDays = room.calendarExceptionEvents
            .filter((e) => !e.outOfService && this.weeksOverlap(e.startDate, e.endDate, start, end))
            .flatMap((d) => this.daysBetween(DateTime.fromISO(d.startDate), DateTime.fromISO(d.endDate)))
            .map((d) => (d.start?.weekday === 7 ? 0 : (d.start as DateTime).weekday)); // locale nuisances
        const closedDays = new Set(
            [0, 1, 2, 3, 4, 5, 6].filter((x) => regularDays.concat(extraDays).indexOf(x) === -1),
        );
        return Array.from(closedDays);
    }

    listRooms$ = () => this.http.get<ExamRoom[]>('/app/rooms');
    listAccessibilityCriteria$ = () => this.http.get<Accessibility[]>('/app/accessibility');
    listOrganisations$ = () => this.http.get<Organisation[]>('/app/iop/organisations');

    listSlots$ = (external: boolean, collaborative: boolean, room: ExamRoom, examId: number, params: HttpParams) => {
        let url: string;
        if (external) {
            url = collaborative
                ? `/app/iop/exams/${examId}/external/calendar/${room._id}`
                : `/app/iop/calendar/${examId}/${room._id}`;
        } else {
            url = collaborative ? `/app/iop/exams/${examId}/calendar/${room.id}` : `/app/calendar/${examId}/${room.id}`;
        }
        return this.http.get<AvailableSlot[]>(url, { params: params });
    };

    getReservationiWindowSize$ = () => this.http.get<{ value: number }>('/app/settings/reservationWindow');
    getExamVisitSupportStatus$ = () => this.http.get<{ isExamVisitSupported: boolean }>('/app/settings/iop/examVisit');
    getCurrentEnrolment$ = (id: number) => this.http.get<ExamEnrolment | null>(`/app/calendar/enrolment/${id}/current`);
    getExamInfo$ = (collaborative: boolean, id: number) =>
        this.http.get<ExamInfo>(collaborative ? `/app/iop/exams/${id}/info` : `/app/student/exam/${id}/info`);

    private daysBetween = (start: DateTime, end: DateTime) => Interval.fromDateTimes(start, end).splitBy({ day: 1 });
    private normalize = (d: DateTime) => DateTime.now().set({ hour: d.hour, minute: d.minute, second: d.second });
    private adjustBack(date: DateTime): string {
        const offset = date.isInDST ? 1 : 0;
        return date.toUTC().plus({ hour: offset }).toISO() as string;
    }
    private weeksOverlap = (w1d1: string, w1d2: string, w2d1: string, w2d2: string) =>
        DateTime.fromISO(w1d1).weekNumber <= DateTime.fromISO(w2d1).weekNumber &&
        DateTime.fromISO(w1d2).weekNumber >= DateTime.fromISO(w2d2).weekNumber;

    private hasMultiDayExceptionalOpeningDuring = (exceptions: ExceptionWorkingHours[], start: string, end: string) =>
        exceptions
            .filter((e) => !e.outOfService && this.weeksOverlap(e.startDate, e.endDate, start, end))
            .some((e) => DateTime.fromISO(e.startDate).ordinal !== DateTime.fromISO(e.endDate).ordinal);

    private reserveInternal$ = (slot: Slot, accs: Accessibility[], collaborative: boolean): Observable<void> => {
        slot.aids = accs.map((item) => item.id);
        const url = collaborative ? '/app/iop/calendar/reservation' : '/app/calendar/reservation';
        return this.http.post<void>(url, slot);
    };

    private reserveExternal$ = (slot: Slot, collaborative = false) => {
        const url = collaborative ? '/app/iop/calendar/external/reservation' : '/app/iop/reservations/external';
        return this.http.post<void>(url, slot);
    };

    private findOpeningHours = (dwh: DefaultWorkingHours, items: OpeningHours[]) =>
        items.find((i) => i.ref === dwh.weekday);

    private formatExceptionEvent(
        event: ExceptionWorkingHours,
        tz: string,
    ): ExceptionWorkingHours & { start: string; end: string; description: string } {
        const startDate = DateTime.fromISO(event.startDate, { zone: tz });
        const endDate = DateTime.fromISO(event.endDate, { zone: tz });
        return {
            ...event,
            start: startDate.toFormat('dd.MM.yyyy HH:mm'),
            end: endDate.toFormat('dd.MM.yyyy HH:mm'),
            description: event.outOfService ? 'i18n_closed' : 'i18n_open',
        };
    }
}
