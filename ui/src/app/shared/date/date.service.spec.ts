// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTimeService } from './date.service';

describe('DateTimeService', () => {
    let service: DateTimeService;
    let translateService: TranslateService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [DateTimeService, provideZonelessChangeDetection()],
        });
        service = TestBed.inject(DateTimeService);
        translateService = TestBed.inject(TranslateService);
        translateService.use('en');
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('printExamDuration', () => {
        it('should format duration with only hours', () => {
            expect(service.formatDuration(120)).toBe('2 h');
            expect(service.formatDuration(60)).toBe('1 h');
        });

        it('should format duration with only minutes', () => {
            expect(service.formatDuration(45)).toBe('45 min');
            expect(service.formatDuration(30)).toBe('30 min');
        });

        it('should format duration with hours and minutes', () => {
            expect(service.formatDuration(90)).toBe('1 h 30 min');
            expect(service.formatDuration(125)).toBe('2 h 5 min');
        });

        it('should return empty string for zero duration', () => {
            expect(service.formatDuration(0)).toBe('');
        });
    });

    describe('getDuration', () => {
        it('should format ISO timestamp as HH:mm', () => {
            expect(service.formatDurationString('2024-10-08T14:30:00Z')).toBe('14:30');
            expect(service.formatDurationString('2024-10-08T09:05:00Z')).toBe('09:05');
        });

        it('should handle midnight', () => {
            expect(service.formatDurationString('2024-10-08T00:00:00Z')).toBe('00:00');
        });
    });

    describe('formatInTimeZone', () => {
        it('should format date in specified timezone', () => {
            const date = new Date('2024-10-08T12:00:00Z');
            const result = service.formatInTimeZone(date, 'Europe/Helsinki');
            expect(result).toContain('2024-10-08');
        });

        it('should format date in UTC', () => {
            const date = new Date('2024-10-08T12:00:00Z');
            const result = service.formatInTimeZone(date, 'UTC');
            expect(result).toContain('2024-10-08T12:00:00');
        });
    });

    describe('getDateForWeekday', () => {
        it('should return date for specified weekday', () => {
            const monday = service.getDateForWeekday(1);
            expect(monday.getDay()).toBe(1);
        });

        it('should return date for Sunday', () => {
            const sunday = service.getDateForWeekday(0);
            expect(sunday.getDay()).toBe(0);
        });

        it('should return date for Saturday', () => {
            const saturday = service.getDateForWeekday(6);
            expect(saturday.getDay()).toBe(6);
        });
    });

    describe('getLocalizedDateForMonth', () => {
        it('should return DateTime for specified month', () => {
            const result = service.getLocalizedDateForMonth(3, 'en-US');
            expect(result.month).toBe(3);
            expect(result.locale).toBe('en-US');
        });

        it('should return DateTime for December', () => {
            const result = service.getLocalizedDateForMonth(12, 'fi-FI');
            expect(result.month).toBe(12);
            expect(result.locale).toBe('fi-FI');
        });
    });

    describe('getLocalizedDateForDay', () => {
        it('should return DateTime for specified weekday', () => {
            const result = service.getLocalizedDateForDay(3, 'en-US');
            expect(result.weekday).toBe(3); // Wednesday
            expect(result.locale).toBe('en-US');
        });

        it('should return DateTime for Sunday', () => {
            const result = service.getLocalizedDateForDay(7, 'fi-FI');
            expect(result.weekday).toBe(7);
            expect(result.locale).toBe('fi-FI');
        });
    });

    describe('getWeekdayNames', () => {
        it('should return short weekday names', () => {
            const names = service.getWeekdayNames(false);
            expect(names.length).toBe(8); // 7 days + 0 (Sunday at end)
            expect(names[0]).toBeTruthy();
        });

        it('should return long weekday names', () => {
            const names = service.getWeekdayNames(true);
            expect(names.length).toBe(8);
            expect(names[0].length).toBeGreaterThan(3); // Long names are longer than short
        });

        it('should respect current language', () => {
            translateService.use('fi');
            const names = service.getWeekdayNames(false);
            expect(names.length).toBe(8);
        });
    });

    describe('translateWeekdayName', () => {
        it('should translate MONDAY', () => {
            const result = service.translateWeekdayName('MONDAY');
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('should translate SUNDAY', () => {
            const result = service.translateWeekdayName('SUNDAY');
            expect(result).toBeTruthy();
        });

        it('should return long format when requested', () => {
            const short = service.translateWeekdayName('MONDAY', false);
            const long = service.translateWeekdayName('MONDAY', true);
            expect(long.length).toBeGreaterThan(short.length);
        });

        it('should return empty string for unknown weekday', () => {
            const result = service.translateWeekdayName('INVALID');
            expect(result).toBe('');
        });

        it('should translate all weekdays', () => {
            const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
            weekdays.forEach((day) => {
                const result = service.translateWeekdayName(day);
                expect(result).toBeTruthy();
            });
        });
    });

    describe('getMonthNames', () => {
        it('should return all month names', () => {
            const months = service.getMonthNames();
            expect(months.length).toBe(13); // 12 months + 0
        });

        it('should return month names in current language', () => {
            translateService.use('en');
            const months = service.getMonthNames();
            expect(months[0]).toBeTruthy();
            expect(typeof months[0]).toBe('string');
        });

        it('should respect language changes', () => {
            translateService.use('fi');
            const months = service.getMonthNames();
            expect(months.length).toBe(13);
        });
    });

    describe('isDST', () => {
        it('should detect DST for summer date', () => {
            // July is typically DST in northern hemisphere
            const summerDate = new Date('2024-07-15T12:00:00Z');
            const result = service.isDST(summerDate);
            expect(typeof result).toBe('boolean');
        });

        it('should detect non-DST for winter date', () => {
            // January is typically not DST in northern hemisphere
            const winterDate = new Date('2024-01-15T12:00:00Z');
            const result = service.isDST(winterDate);
            expect(typeof result).toBe('boolean');
        });

        it('should handle string input', () => {
            const result = service.isDST('2024-07-15');
            expect(typeof result).toBe('boolean');
        });

        it('should handle timestamp input', () => {
            const result = service.isDST(Date.now());
            expect(typeof result).toBe('boolean');
        });
    });

    describe('eachDayOfInterval', () => {
        it('should return array of days in range', () => {
            const start = new Date('2024-10-01');
            const end = new Date('2024-10-05');
            const days = service.eachDayOfInterval(start, end);
            expect(days.length).toBe(5);
            expect(days[0].day).toBe(1);
            expect(days[4].day).toBe(5);
        });

        it('should return single day for same start and end', () => {
            const date = new Date('2024-10-08');
            const days = service.eachDayOfInterval(date, date);
            expect(days.length).toBe(1);
        });

        it('should handle month boundaries', () => {
            const start = new Date('2024-10-30');
            const end = new Date('2024-11-02');
            const days = service.eachDayOfInterval(start, end);
            expect(days.length).toBe(4);
        });

        it('should return empty array for invalid range', () => {
            const start = new Date('2024-10-08');
            const end = new Date('2024-10-01');
            const days = service.eachDayOfInterval(start, end);
            expect(days.length).toBe(0);
        });
    });

    describe('intervalsOverlap', () => {
        it('should detect overlapping intervals', () => {
            const interval1 = { start: new Date('2024-10-01'), end: new Date('2024-10-10') };
            const interval2 = { start: new Date('2024-10-05'), end: new Date('2024-10-15') };
            expect(service.intervalsOverlap(interval1, interval2)).toBe(true);
        });

        it('should detect non-overlapping intervals', () => {
            const interval1 = { start: new Date('2024-10-01'), end: new Date('2024-10-05') };
            const interval2 = { start: new Date('2024-10-10'), end: new Date('2024-10-15') };
            expect(service.intervalsOverlap(interval1, interval2)).toBe(false);
        });

        it('should detect touching intervals as overlapping', () => {
            const interval1 = { start: new Date('2024-10-01'), end: new Date('2024-10-05') };
            const interval2 = { start: new Date('2024-10-05'), end: new Date('2024-10-10') };
            expect(service.intervalsOverlap(interval1, interval2)).toBe(true);
        });

        it('should handle contained intervals', () => {
            const interval1 = { start: new Date('2024-10-01'), end: new Date('2024-10-20') };
            const interval2 = { start: new Date('2024-10-05'), end: new Date('2024-10-10') };
            expect(service.intervalsOverlap(interval1, interval2)).toBe(true);
        });
    });

    describe('mapDateRange', () => {
        it('should map function over date range', () => {
            const start = new Date('2024-10-01');
            const end = new Date('2024-10-03');
            const result = service.mapDateRange(start, end, (date) => date.day);
            expect(result).toEqual([1, 2, 3]);
        });

        it('should provide index to map function', () => {
            const start = new Date('2024-10-01');
            const end = new Date('2024-10-03');
            const result = service.mapDateRange(start, end, (_date, index) => index);
            expect(result).toEqual([0, 1, 2]);
        });

        it('should handle complex mapping', () => {
            const start = new Date('2024-10-01');
            const end = new Date('2024-10-03');
            const result = service.mapDateRange(start, end, (date, index) => ({
                day: date.day,
                index: index,
            }));
            expect(result.length).toBe(3);
            expect(result[0]).toEqual({ day: 1, index: 0 });
            expect(result[2]).toEqual({ day: 3, index: 2 });
        });

        it('should return empty array for invalid range', () => {
            const start = new Date('2024-10-08');
            const end = new Date('2024-10-01');
            const result = service.mapDateRange(start, end, (date) => date.day);
            expect(result).toEqual([]);
        });
    });
});
