// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { EventClickArg, EventInput } from '@fullcalendar/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import { SessionService } from 'src/app/session/session.service';
import { vi } from 'vitest';
import { BookingCalendarComponent } from './booking-calendar.component';
import { CalendarService } from './calendar.service';

describe('BookingCalendarComponent', () => {
    let component: BookingCalendarComponent;
    let fixture: ComponentFixture<BookingCalendarComponent>;
    const at = (hour: number) => new Date(2030, 5, 12, hour, 0, 0);
    const calendar = {
        getClosedWeekdays: vi.fn(() => [0, 6]),
        getEarliestOpening: vi.fn(() => at(8)),
        getLatestClosing: vi.fn(() => at(16)),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [BookingCalendarComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                { provide: CalendarService, useValue: calendar },
                { provide: SessionService, useValue: { getUser: () => ({ isAdmin: false }) } },
            ],
        });
        TestBed.overrideComponent(BookingCalendarComponent, { set: { imports: [], template: '' } });
        fixture = TestBed.createComponent(BookingCalendarComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('room', { id: 3, localTimezone: 'Europe/Helsinki' } as ExamRoom);
        fixture.detectChanges();
    });

    it('should show the room zone, open days and opening hours with an hour of margin', () => {
        const options = component.calendarOptions();
        expect(options.timeZone).toBe('Europe/Helsinki');
        expect(options.hiddenDays).toEqual([0, 6]);
        expect([options.slotMinTime, options.slotMaxTime]).toEqual(['07:00:00', '17:00:00']);
    });

    it('should not pad hours beyond the day', () => {
        calendar.getEarliestOpening.mockReturnValue(at(0));
        calendar.getLatestClosing.mockReturnValue(new Date(2030, 5, 12, 23, 59, 59));

        component.refetch({ startStr: '2030-06-10T00:00:00+03:00', timeZone: 'Europe/Helsinki' }, vi.fn());

        const options = component.calendarOptions();
        expect([options.slotMinTime, options.slotMaxTime]).toEqual(['00:00:00', '23:59:59']);
    });

    it('should say the times are room time only when this device is on another clock', () => {
        const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // UTC-12, which no one lives in
        const elsewhere = 'Etc/GMT+12';

        fixture.componentRef.setInput('room', { id: 3, localTimezone: here } as ExamRoom);
        expect(component.otherZone()).toBeUndefined();

        fixture.componentRef.setInput('room', { id: 3, localTimezone: elsewhere } as ExamRoom);
        expect(component.otherZone()).toBe(elsewhere);
    });

    it('should title the week from its wall-clock dates', () => {
        // FullCalendar markers hold the shown wall time in their UTC fields
        const week = {
            start: { marker: new Date(Date.UTC(2030, 5, 10)) },
            end: { marker: new Date(Date.UTC(2030, 5, 17)) },
        };
        const title = (lang: string) =>
            (component['getFormatOverrides'](lang).titleFormat as (info: typeof week) => string)(week);

        expect(title('fi')).toBe('10. – 16.6.2030');
        expect(title('en')).toBe('10 - 16 Jun 2030');
    });

    it('should title weeks across months and years, and single days', () => {
        type Info = { start: { marker: Date }; end?: { marker: Date } };
        const span = (from: Date, to?: Date): Info => ({
            start: { marker: from },
            ...(to ? { end: { marker: to } } : {}),
        });
        const title = (lang: string, info: Info) =>
            (component['getFormatOverrides'](lang).titleFormat as (info: Info) => string)(info);
        const acrossMonths = span(new Date(Date.UTC(2030, 5, 28)), new Date(Date.UTC(2030, 6, 5)));
        const acrossYears = span(new Date(Date.UTC(2030, 11, 30)), new Date(Date.UTC(2031, 0, 6)));
        const day = span(new Date(Date.UTC(2030, 5, 10)));

        expect(title('fi', acrossMonths)).toBe('28.6. – 4.7.2030');
        expect(title('fi', acrossYears)).toBe('30.12.2030 – 5.1.2031');
        expect(title('fi', day)).toBe('10.6.2030');
        expect(title('en', acrossMonths)).toBe('28 Jun - 4 Jul 2030');
        expect(title('en', acrossYears)).toBe('30 Dec 2030 - 5 Jan 2031');
        expect(title('en', day)).toBe('10 Jun 2030');
    });

    it('should leave other languages to FullCalendar formatting', () => {
        expect(component['getFormatOverrides']('sv')).toEqual({
            dayHeaderFormat: { weekday: 'short', month: 'numeric', day: 'numeric', omitCommas: true },
            titleFormat: { year: 'numeric', month: 'short', day: 'numeric' },
        });
        expect(component['getFormatOverrides']('fi').dayHeaderFormat).toBe('cccc d.L.');
    });

    it('should ask slots for the shown week', () => {
        const asked = vi.fn();
        component.moreEventsNeeded.subscribe(asked);

        component.refetch({ startStr: '2030-06-10T00:00:00+03:00', timeZone: 'Europe/Helsinki' }, vi.fn());

        expect(calendar.getClosedWeekdays).toHaveBeenLastCalledWith(
            expect.anything(),
            '2030-06-10T00:00:00+03:00',
            expect.stringMatching(/^2030-06-16T23:59:59/),
        );
        expect(asked).toHaveBeenCalledWith(expect.objectContaining({ date: '2030-06-10T00:00:00+03:00' }));
    });

    it('should make the grid taller for events shorter than the exam', () => {
        fixture.componentRef.setInput('examDuration', 60);
        let success: (events: EventInput[]) => void = () => undefined;
        component.moreEventsNeeded.subscribe((e) => (success = e.success));
        const shown = vi.fn();
        component.refetch({ startStr: '2030-06-10T00:00:00+03:00', timeZone: 'UTC' }, shown);
        expect(component.slotHeight()).toBe('1.8em');

        const events = [{ start: at(8), end: new Date(2030, 5, 12, 8, 15) }];
        success(events);

        expect(shown).toHaveBeenCalledWith(events);
        expect(component.slotHeight()).toBe('5.4em');
    });

    it('should pick only slots with free machines', () => {
        const picked = vi.fn();
        component.eventSelected.subscribe(picked);
        const click = (availableMachines: number) =>
            component.eventClicked({ event: { extendedProps: { availableMachines } } } as unknown as EventClickArg);

        click(0);
        click(2);

        expect(picked).toHaveBeenCalledTimes(1);
    });
});
