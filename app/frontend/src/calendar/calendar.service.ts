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
import 'moment-timezone';

import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { StateParams } from '@uirouter/core';
import * as moment from 'moment';
import { Observable } from 'rxjs';

import { DefaultWorkingHours, ExamRoom, ExceptionWorkingHours } from '../reservation/reservation.model';
import { SessionService } from '../session/session.service';
import { DateTimeService } from '../utility/date/date.service';

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

@Injectable()
export class CalendarService {
    constructor(
        private http: HttpClient,
        @Inject('$stateParams') private stateParams: StateParams,
        private DateTime: DateTimeService,
        private Session: SessionService,
    ) {}

    private adjustBack(date: moment.Moment, tz: string): string {
        const adjusted = moment.tz(date, tz);
        const offset = adjusted.isDST() ? 1 : 0;
        return moment.utc(adjusted.add(offset, 'hour')).format();
    }

    private reserveInternal$ = (
        slot: Slot,
        accs: { filtered: boolean; id: number }[],
        collaborative: boolean,
    ): Observable<void> => {
        slot.aids = accs.filter(item => item.filtered).map(item => item.id);
        const url = collaborative ? '/integration/iop/calendar/reservation' : '/app/calendar/reservation';
        return this.http.post<void>(url, slot);
    };

    private reserveExternal$ = (slot: Slot) => this.http.post<void>('/integration/iop/reservations/external', slot);

    reserve$(
        start: moment.Moment,
        end: moment.Moment,
        room: ExamRoom,
        accs: { filtered: boolean; id: number }[],
        org: { _id: string | null },
        collaborative = false,
        sectionIds: number[] = [],
    ) {
        const tz = room.localTimezone;
        const slot: Slot = {
            start: this.adjustBack(start, tz),
            end: this.adjustBack(end, tz),
            examId: parseInt(this.stateParams.id),
            roomId: room._id ? room._id : room.id,
            orgId: org._id,
            sectionIds: sectionIds,
        };
        if (org._id !== null) {
            return this.reserveExternal$(slot);
        } else {
            return this.reserveInternal$(slot, accs, collaborative);
        }
    }

    renderCalendarTitle() {
        // Fix date range format in title
        const selector = $('.fc-toolbar .fc-center > h2');
        const title = selector.text();
        const separator = ' — ';
        const endPart = title.split(separator)[1];
        const startFragments: string[] = title
            .split(separator)[0]
            .split('.')
            .filter(f => {
                // ignore empty fragments (introduced if title already correctly formatted)
                return f.length > 0;
            });
        let newTitle = '';
        if (startFragments.length < 3) {
            startFragments.forEach(f => {
                newTitle += f;
                if (f && f[f.length - 1] !== '.') {
                    newTitle += '.';
                }
            });
            newTitle += separator + endPart;
            selector.text(newTitle);
        }
    }

    private findOpeningHours = (dwh: DefaultWorkingHours, items: OpeningHours[]) =>
        items.find(i => i.ref === dwh.weekday);

    getWeekdayNames(): WeekdayNames {
        const lang = this.Session.getUser().lang;
        const locale = lang.toLowerCase() + '-' + lang.toUpperCase();
        const options = { weekday: 'short' };
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

        room.defaultWorkingHours.forEach(dwh => {
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
                hours.periods.push(
                    moment.tz(dwh.startTime, tz).format('HH:mm') + ' - ' + moment.tz(dwh.endTime, tz).format('HH:mm'),
                );
            }
        });
        openingHours.forEach(oh => {
            oh.periodText = oh.periods.sort().join(', ');
        });
        return openingHours.sort((a, b) => a.ord - b.ord);
    }

    private static formatExceptionEvent(
        event: ExceptionWorkingHours,
        tz: string,
    ): ExceptionWorkingHours & { start: string; end: string; description: string } {
        const startDate = moment.tz(event.startDate, tz);
        const endDate = moment.tz(event.endDate, tz);
        return {
            ...event,
            start: startDate.format('DD.MM.YYYY HH:mm'),
            end: endDate.format('DD.MM.YYYY HH:mm'),
            description: event.outOfService ? 'sitnet_closed' : 'sitnet_open',
        };
    }

    getExceptionHours(room: ExamRoom, start: moment.Moment, end: moment.Moment) {
        const maxStart = moment.max(moment(), start);
        const events = room.calendarExceptionEvents.filter(e => {
            return moment(e.startDate) > maxStart && moment(e.endDate) < end;
        });
        return events.map(e => CalendarService.formatExceptionEvent(e, room.localTimezone));
    }

    getExceptionalAvailability(room: ExamRoom) {
        return room.calendarExceptionEvents.map(e => CalendarService.formatExceptionEvent(e, room.localTimezone));
    }

    getEarliestOpening(room: ExamRoom): moment.Moment {
        const tz = room.localTimezone;
        const openings = room.defaultWorkingHours.map(dwh => {
            const start = moment.tz(dwh.startTime, tz);
            return moment()
                .hours(start.hours())
                .minutes(start.minutes())
                .seconds(start.seconds());
        });
        return moment.min(...openings);
    }

    getLatestClosing(room: ExamRoom): moment.Moment {
        const tz = room.localTimezone;
        const closings = room.defaultWorkingHours.map(dwh => {
            const end = moment.tz(dwh.endTime, tz);
            return moment()
                .hours(end.hours())
                .minutes(end.minutes())
                .seconds(end.seconds());
        });
        return moment.max(...closings);
    }

    getClosedWeekdays(room: ExamRoom): number[] {
        const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const openedDays = room.defaultWorkingHours.map(dwh => weekdays.indexOf(dwh.weekday));
        return [0, 1, 2, 3, 4, 5, 6].filter(x => openedDays.indexOf(x) === -1);
    }
}
