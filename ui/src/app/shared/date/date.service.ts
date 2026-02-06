// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DateTime, WeekdayNumbers } from 'luxon';
import { range } from 'ramda';

export enum REPEAT_OPTION {
    once = 'ONCE',
    daily_weekly = 'DAILY_WEEKLY',
    monthly = 'MONTHLY',
    yearly = 'YEARLY',
}

@Injectable({ providedIn: 'root' })
export class DateTimeService {
    private translate = inject(TranslateService);

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

    getDuration = (timestamp: string) => DateTime.fromISO(timestamp, { zone: 'UTC' }).toFormat('HH:mm');

    formatInTimeZone = (date: Date, tz: string) => DateTime.fromJSDate(date, { zone: tz }).toISO();

    getDateForWeekday(weekday: number): Date {
        const now = new Date();
        const distance = weekday - now.getDay();
        return new Date(now.setDate(now.getDate() + distance));
    }

    getLocalizedDateForMonth = (ordinal: number, locale: string): DateTime =>
        DateTime.now().set({ month: ordinal }).setLocale(locale);

    getLocalizedDateForDay = (ordinal: WeekdayNumbers, locale: string): DateTime =>
        DateTime.now().set({ weekday: ordinal }).setLocale(locale);

    getWeekdayNames = (long = false): string[] => {
        const length = long ? 'long' : 'short';
        const lang = this.translate.getCurrentLang();
        const locale = lang.toLowerCase() + '-' + lang.toUpperCase();
        const options: Intl.DateTimeFormatOptions = { weekday: length };
        return range(1, 7)
            .concat(0)
            .map(this.getDateForWeekday)
            .map((d) => d.toLocaleDateString(locale, options));
    };

    translateWeekdayName = (weekDay: string, long = false): string => {
        const weekdayMap: Record<string, number> = {
            MONDAY: 1,
            TUESDAY: 2,
            WEDNESDAY: 3,
            THURSDAY: 4,
            FRIDAY: 5,
            SATURDAY: 6,
            SUNDAY: 7,
        };
        const ordinal = weekdayMap[weekDay];
        if (!ordinal) return '';
        const length = long ? 'long' : 'short';
        const lang = this.translate.getCurrentLang();
        const locale = lang.toLowerCase() + '-' + lang.toUpperCase();
        const options: Intl.DateTimeFormatOptions = { weekday: length };
        return this.getDateForWeekday(ordinal).toLocaleDateString(locale, options);
    };

    getMonthNames = (): string[] => {
        const lang = this.translate.getCurrentLang();
        const locale = lang.toLowerCase() + '-' + lang.toUpperCase();
        return range(1, 12)
            .concat(0)
            .map((m) => this.getLocalizedDateForMonth(m, locale).monthLong as string);
    };

    isDST = (date: Date | string | number): boolean => {
        const d = new Date(date);
        const jan = new Date(d.getFullYear(), 0, 1);
        const jul = new Date(d.getFullYear(), 6, 1);
        const offset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
        return d.getTimezoneOffset() < offset;
    };

    eachDayOfInterval = (start: Date, end: Date): DateTime[] => {
        const startDate = DateTime.fromJSDate(start).startOf('day');
        const endDate = DateTime.fromJSDate(end).startOf('day');
        const daysDiff = Math.floor(endDate.diff(startDate, 'days').days) + 1;

        return Array.from({ length: Math.max(0, daysDiff) }, (_, index) => startDate.plus({ days: index }));
    };

    intervalsOverlap = (a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean =>
        a.start <= b.end && b.start <= a.end;

    mapDateRange = <T>(start: Date, end: Date, mapFn: (date: DateTime, index: number) => T): T[] =>
        this.eachDayOfInterval(start, end).map(mapFn);
}
