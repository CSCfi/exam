/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import type { Observable } from 'rxjs';
import { ExamEnrolment } from '../enrolment/enrolment.model';
import { Course, Exam, ExamSection, MaintenancePeriod } from '../exam/exam.model';
import type {
    Accessibility,
    DefaultWorkingHours,
    ExamRoom,
    ExceptionWorkingHours,
} from '../reservation/reservation.model';
import { SessionService } from '../session/session.service';
import { DateTimeService } from '../shared/date/date.service';

type WeekdayNames = Record<string, { ord: number; name: string }>;

export interface Slot {
    start: string;
    end: string;
    conflictingExam?: boolean;
    roomId: number | string;
    examId: number;
    orgId: string | null;
    aids?: number[];
    sectionIds: number[];
}

export interface OpeningHours {
    name: string;
    ref: string;
    ord: number;
    periods: string[];
    periodText?: string;
}

export type SelectableSection = ExamSection & { selected: boolean };
export type ExamInfo = Omit<Partial<Exam>, 'course' | 'examSections'> & { course: Course } & {
    duration: number;
    examSections: (ExamSection & { selected: boolean })[];
};
export type Organisation = {
    _id: string;
    name: string;
    code: string;
    filtered: boolean;
    homeOrg: string;
    facilities: ExamRoom[];
};
export type AvailableSlot = Slot & { availableMachines: number };

@Injectable({ providedIn: 'root' })
export class CalendarService {
    constructor(
        private http: HttpClient,

        private DateTime: DateTimeService,
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
        const weekday = this.DateTime.getDateForWeekday;
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

    getEarliestOpening(room: ExamRoom): Date {
        const tz = room.localTimezone;
        const openings = room.defaultWorkingHours.map((dwh) => {
            const start = DateTime.fromISO(dwh.startTime, { zone: tz });
            return DateTime.now().set({ hour: start.hour, minute: start.minute, second: start.second });
        });
        return DateTime.min(...openings)
            .set({ minute: 0 })
            .toJSDate();
    }

    getLatestClosing(room: ExamRoom): Date {
        const tz = room.localTimezone;
        const closings = room.defaultWorkingHours.map((dwh) => {
            const end = DateTime.fromISO(dwh.endTime, { zone: tz });
            return DateTime.now().set({ hour: end.hour, minute: end.minute, second: end.second });
        });
        return DateTime.max(...closings).toJSDate();
    }

    getClosedWeekdays(room: ExamRoom): number[] {
        const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const openedDays = room.defaultWorkingHours.map((dwh) => weekdays.indexOf(dwh.weekday));
        return [0, 1, 2, 3, 4, 5, 6].filter((x) => openedDays.indexOf(x) === -1);
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

    private adjustBack(date: DateTime): string {
        const offset = date.isInDST ? 1 : 0;
        return date.toUTC().plus({ hour: offset }).toISO() as string;
    }

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
            description: event.outOfService ? 'sitnet_closed' : 'sitnet_open',
        };
    }
}
