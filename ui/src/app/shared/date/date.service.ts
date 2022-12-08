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
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { format, roundToNearestMinutes } from 'date-fns';
import { DateTime } from 'luxon';
import { range } from 'ramda';

export enum REPEAT_OPTIONS {
    once = 'ONCE',
    daily_weekly = 'DAILY_WEEKLY',
    monthly = 'MONTHLY',
    yearly = 'YEARLY',
}

@Injectable({ providedIn: 'root' })
export class DateTimeService {
    constructor(private translate: TranslateService) {}

    printExamDuration(exam: { duration: number }): string {
        if (exam.duration) {
            const h = Math.floor(exam.duration / 60);
            const m = exam.duration % 60;
            if (h === 0) {
                return m + ' min';
            } else if (m === 0) {
                return h + ' h';
            } else {
                return h + ' h ' + m + ' min';
            }
        }
        return '';
    }

    getDuration = (timestamp: string) =>
        format(roundToNearestMinutes(DateTime.fromISO(timestamp, { zone: 'UTC' }).toJSDate()), 'HH:mm');

    formatInTimeZone = (date: Date, tz: string) => DateTime.fromJSDate(date, { zone: tz }).toISO();

    getDateForWeekday(ordinal: number): Date {
        const now = new Date();
        const distance = ordinal - now.getDay();
        return new Date(now.setDate(now.getDate() + distance));
    }

    getDateForMonth(ordinal: number): Date {
        const now = new Date();
        const distance = ordinal - now.getMonth();
        return new Date(now.setMonth(now.getMonth() + distance));
    }

    getWeekdayNames(long?: boolean): string[] {
        const length = long ? 'long' : 'short';
        const lang = this.translate.currentLang;
        const locale = lang.toLowerCase() + '-' + lang.toUpperCase();
        const options: Intl.DateTimeFormatOptions = { weekday: length };
        return range(1, 7)
            .concat(0)
            .map((d) => this.getDateForWeekday(d).toLocaleDateString(locale, options));
    }
    translateWeekdayName(weekDay: string, long?: boolean): string {
        // This function has been moved to date service @DELETEME
        const length = long ? 'long' : 'short';
        const lang = this.translate.currentLang;
        const locale = lang.toLowerCase() + '-' + lang.toUpperCase();
        const options: Intl.DateTimeFormatOptions = { weekday: length };
        switch (weekDay) {
            case 'MONDAY':
                return this.getDateForWeekday(1).toLocaleDateString(locale, options);
            case 'TUESDAY':
                return this.getDateForWeekday(2).toLocaleDateString(locale, options);
            case 'WEDNESDAY':
                return this.getDateForWeekday(3).toLocaleDateString(locale, options);
            case 'THURSDAY':
                return this.getDateForWeekday(4).toLocaleDateString(locale, options);
            case 'FRIDAY':
                return this.getDateForWeekday(5).toLocaleDateString(locale, options);
            case 'SATURDAY':
                return this.getDateForWeekday(6).toLocaleDateString(locale, options);
            case 'SUNDAY':
                return this.getDateForWeekday(7).toLocaleDateString(locale, options);
        }
        return '';
    }

    getMonthNames(long?: boolean): string[] {
        const length = long ? 'long' : 'short';
        const lang = this.translate.currentLang;
        const locale = lang.toLowerCase() + '-' + lang.toUpperCase();
        const options: Intl.DateTimeFormatOptions = { month: length };
        return range(1, 12)
            .concat(0)
            .map((m) => this.getDateForMonth(m - 1).toLocaleDateString(locale, options));
    }

    isDST = (date: Date | string | number): boolean => {
        const d = new Date(date);
        const jan = new Date(d.getFullYear(), 0, 1);
        const jul = new Date(d.getFullYear(), 6, 1);
        const offset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
        return d.getTimezoneOffset() < offset;
    };
}
