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
import * as angular from 'angular';
import { IDeferred } from 'angular';
import * as moment from 'moment';
import 'moment-timezone';
import * as toastr from 'toastr';
import { SessionService } from '../session/session.service';
import { DateTimeService } from '../utility/date/date.service';



export interface Room {
    id: number;
    _id?: string;
    name: string;
    localTimezone: string;
    defaultWorkingHours: any[];
    calendarExceptionEvents: any[];
    roomInstruction: string | null;
    roomInstructionSV: string | null;
    roomInstructionEN: string | null;
    accessibilities: { id: number, name: string }[];
    outOfService: boolean;
    statusComment: string | null;
}

export interface Slot {
    start: string;
    end: string;
    conflictingExam?: boolean;
    roomId: number | string;
    examId: number;
    orgId: string | null;
    aids?: number[];
}

export interface OpeningHours {
    name: string;
    ref: string;
    ord: number;
    periods: string[];
    periodText?: string;
}

export class CalendarService {

    constructor(
        private $q: angular.IQService,
        private $http: angular.IHttpService,
        private $routeParams: angular.route.IRouteParamsService,
        private $translate: angular.translate.ITranslateService,
        private $location: angular.ILocationService,
        private DateTime: DateTimeService,
        private Session: SessionService,
        private uiCalendarConfig: any
    ) {
        'ngInject';
    }

    private adjustBack(date: moment.Moment, tz: string): string {
        const adjusted = moment.tz(date, tz);
        const offset = adjusted.isDST() ? 1 : 0;
        return moment.utc(adjusted.add(offset, 'hour')).format();
    }

    private reserveInternal(slot: Slot, accs: { filtered: boolean; id: number }[], promise: IDeferred<any>,
        collaborative: boolean) {

        slot.aids = accs.filter(
            function (item) {
                return item.filtered;
            })
            .map(function (item) {
                return item.id;
            });
        const url = collaborative ? '/integration/iop/calendar/reservation' : '/app/calendar/reservation';
        this.$http.post(url, slot).then(() => {
            this.$location.path('/');
            promise.resolve();
        }).catch((resp) => {
            toastr.error(resp.data);
            promise.reject(resp);
        });
    }

    private reserveExternal(slot: Slot, promise: IDeferred<any>) {
        this.$http.post('/integration/iop/reservations/external', slot).then(() => {
            this.$location.path('/');
            promise.resolve();
        }).catch((resp) => {
            toastr.error(resp.data);
            promise.reject(resp);
        });
    }

    reserve(start: moment.Moment, end: moment.Moment, room: Room,
        accs: { filtered: boolean; id: number }[], org: { _id: string | null }, collaborative = false) {

        const deferred = this.$q.defer();
        const tz = room.localTimezone;
        const slot: Slot = {
            start: this.adjustBack(start, tz),
            end: this.adjustBack(end, tz),
            examId: parseInt(this.$routeParams.id),
            roomId: room._id != null ? room._id : room.id,
            orgId: org._id
        };
        if (org._id !== null) {
            this.reserveExternal(slot, deferred);
        } else {
            this.reserveInternal(slot, accs, deferred, collaborative);
        }
        return deferred.promise;
    }

    renderCalendarTitle() {
        // Fix date range format in title
        const selector = $('.fc-toolbar .fc-center > h2');
        const title = selector.text();
        const separator = ' — ';
        const endPart = title.split(separator)[1];
        const startFragments: string[] = title.split(separator)[0].split('.').filter(function (x) {
            // ignore empty fragments (introduced if title already correctly formatted)
            return x;
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

    private findOpeningHours(obj, items) {
        return items.find(i => i.ref === obj.weekday);
    }

    getWeekdayNames() {
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
            SATURDAY: { ord: 6, name: weekday(6).toLocaleDateString(locale, options) }
        };
    }


    processOpeningHours(room: Room): OpeningHours[] {
        const weekdayNames = this.getWeekdayNames();
        const openingHours: OpeningHours[] = [];
        const tz = room.localTimezone;

        room.defaultWorkingHours.forEach(dwh => {
            if (!this.findOpeningHours(dwh, openingHours)) {
                const obj = {
                    name: weekdayNames[dwh.weekday].name,
                    ref: dwh.weekday,
                    ord: weekdayNames[dwh.weekday].ord,
                    periods: []
                };
                openingHours.push(obj);
            }
            const hours = this.findOpeningHours(dwh, openingHours);
            hours.periods.push(
                moment.tz(dwh.startTime, tz).format('HH:mm') + ' - ' +
                moment.tz(dwh.endTime, tz).format('HH:mm'));
        });
        openingHours.forEach(oh => {
            oh.periodText = oh.periods.sort().join(', ');
        });
        return openingHours.sort((a, b) => a.ord - b.ord);
    }

    private static formatExceptionEvent(event, tz) {
        const startDate = moment.tz(event.startDate, tz);
        const endDate = moment.tz(event.endDate, tz);
        event.start = startDate.format('DD.MM.YYYY HH:mm');
        event.end = endDate.format('DD.MM.YYYY HH:mm');
        event.description = event.outOfService ? 'sitnet_closed' : 'sitnet_open';
        return event;
    }

    getExceptionHours(room: Room) {
        const view = this.uiCalendarConfig.calendars.myCalendar.fullCalendar('getView');
        if (view.start === undefined || view.end === undefined) {
            return [];
        }
        const start = moment.max(moment(), view.start);
        const end = view.end;
        const events = room.calendarExceptionEvents.filter(function (e) {
            return (moment(e.startDate) > start && moment(e.endDate) < end);
        });
        return events.map(e => CalendarService.formatExceptionEvent(e, room.localTimezone));
    }

    getExceptionalAvailability(room: Room) {
        return room.calendarExceptionEvents.map(e => CalendarService.formatExceptionEvent(e, room.localTimezone));
    }

    getEarliestOpening(room: Room): moment.Moment {
        const tz = room.localTimezone;
        const openings = room.defaultWorkingHours.map(function (dwh) {
            const start = moment.tz(dwh.startTime, tz);
            return moment().hours(start.hours()).minutes(start.minutes()).seconds(start.seconds());
        });
        return moment.min(...openings);
    }

    getLatestClosing(room: Room): moment.Moment {
        const tz = room.localTimezone;
        const closings = room.defaultWorkingHours.map(function (dwh) {
            const end = moment.tz(dwh.endTime, tz);
            return moment().hours(end.hours()).minutes(end.minutes()).seconds(end.seconds());
        });
        return moment.max(...closings);
    }

    getClosedWeekdays(room: Room): number[] {
        const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const openedDays = room.defaultWorkingHours.map(function (dwh) {
            return weekdays.indexOf(dwh.weekday);
        });
        return [0, 1, 2, 3, 4, 5, 6].filter(function (x) {
            return openedDays.indexOf(x) === -1;
        });
    }

}

