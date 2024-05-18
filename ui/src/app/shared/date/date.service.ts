// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';
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

    getDuration = (timestamp: string) => DateTime.fromISO(timestamp, { zone: 'UTC' }).toFormat('HH:mm');

    formatInTimeZone = (date: Date, tz: string) => DateTime.fromJSDate(date, { zone: tz }).toISO();

    getDateForWeekday(ordinal: number): Date {
        const now = new Date();
        const distance = ordinal - now.getDay();
        return new Date(now.setDate(now.getDate() + distance));
    }

    getLocalizedDateForMonth = (ordinal: number, locale: string): DateTime =>
        DateTime.now().set({ month: ordinal }).setLocale(locale);

    getLocalizedDateForDay = (ordinal: WeekdayNumbers, locale: string): DateTime =>
        DateTime.now().set({ weekday: ordinal }).setLocale(locale);

    getWeekdayNames(long = false): string[] {
        const length = long ? 'long' : 'short';
        const lang = this.translate.currentLang;
        const locale = lang.toLowerCase() + '-' + lang.toUpperCase();
        const options: Intl.DateTimeFormatOptions = { weekday: length };
        return range(1, 7)
            .concat(0)
            .map((d) => this.getDateForWeekday(d).toLocaleDateString(locale, options));
    }

    translateWeekdayName(weekDay: string, long = false): string {
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

    getMonthNames = (): string[] => {
        const lang = this.translate.currentLang;
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
}
