// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import type { RepetitionConfig } from 'src/app/facility/facility.model';
import { REPEAT_OPTION } from 'src/app/shared/date/date.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { ExceptionDialogComponent } from './exception-dialog.component';

describe('ExceptionDialogComponent', () => {
    let component: ExceptionDialogComponent;
    let fixture: ComponentFixture<ExceptionDialogComponent>;
    const modal = { close: vi.fn(), dismiss: vi.fn() };
    const toast = { info: vi.fn(), error: vi.fn() };
    const dialogs = { open$: vi.fn(() => of(true)) };

    // Local time, as the pickers give it
    const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

    const repeat = (option: REPEAT_OPTION, config: Partial<RepetitionConfig>) => {
        component.setRepeats(option);
        component.optionChanged({ weekdays: [], ...config } as RepetitionConfig);
        component.ok();
    };

    type Saved = { startDate: Date | string; endDate: Date | string; outOfService: boolean }[];
    const saved = (): Saved => modal.close.mock.calls[0][0];
    const days = () => saved().map((e) => new Date(e.startDate).toDateString());

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [ExceptionDialogComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                { provide: NgbActiveModal, useValue: modal },
                { provide: ToastService, useValue: toast },
                { provide: ConfirmationDialogService, useValue: dialogs },
            ],
        });
        TestBed.inject(TranslateService).use('en');
        fixture = TestBed.createComponent(ExceptionDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    describe('in room time', () => {
        // Nine hours ahead of UTC, so it differs from the zone these tests run in
        beforeEach(() => component.timeZone.set('Asia/Tokyo'));

        it('should take the picked times as room time', () => {
            repeat(REPEAT_OPTION.once, { start: at(2030, 6, 12, 8), end: at(2030, 6, 12, 12) });

            expect(saved()[0].startDate).toBe('2030-06-12T08:00:00.000+09:00');
            expect(saved()[0].endDate).toBe('2030-06-12T12:00:00.000+09:00');
        });

        it('should repeat at the same room time', () => {
            repeat(REPEAT_OPTION.daily_weekly, {
                start: at(2030, 6, 10, 8),
                end: at(2030, 6, 12, 9),
                weekdays: [{ ord: 1 }, { ord: 3 }] as RepetitionConfig['weekdays'],
            });

            expect(saved().map((e) => new Date(e.startDate).toISOString())).toEqual([
                '2030-06-09T23:00:00.000Z',
                '2030-06-11T23:00:00.000Z',
            ]);
        });

        it('should find overlaps in room time', () => {
            // 09:00 - 11:00 in Tokyo
            component.exceptions.set([
                { id: 1, startDate: '2030-06-12T00:00:00Z', endDate: '2030-06-12T02:00:00Z', outOfService: true },
            ]);

            repeat(REPEAT_OPTION.once, { start: at(2030, 6, 12, 8), end: at(2030, 6, 12, 10) });

            expect(toast.error).toHaveBeenCalledWith('i18n_room_closed_overlap');
            expect(modal.close).not.toHaveBeenCalled();
        });
    });

    describe('a single exception', () => {
        it('should be returned as is', () => {
            component.outOfService.set(false);
            repeat(REPEAT_OPTION.once, { start: at(2030, 6, 12, 8), end: at(2030, 6, 12, 12) });

            expect(saved()).toEqual([expect.objectContaining({ id: 0, outOfService: false })]);
            expect(new Date(saved()[0].startDate)).toEqual(at(2030, 6, 12, 8));
            expect(dialogs.open$).not.toHaveBeenCalled();
        });

        it('should be refused when it ends before it starts', () => {
            repeat(REPEAT_OPTION.once, { start: at(2030, 6, 12, 12), end: at(2030, 6, 12, 8) });

            expect(modal.close).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith('i18n_endtime_before_starttime');
        });

        it('should be refused when it overlaps an existing one', () => {
            component.exceptions.set([
                {
                    id: 1,
                    startDate: at(2030, 6, 12, 10).toISOString(),
                    endDate: at(2030, 6, 12, 14).toISOString(),
                    outOfService: true,
                },
            ]);
            repeat(REPEAT_OPTION.once, { start: at(2030, 6, 12, 8), end: at(2030, 6, 12, 12) });

            expect(modal.close).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith('i18n_room_closed_overlap');
        });
    });

    describe('repeating exceptions', () => {
        it('should fall on the chosen weekdays, at the chosen time', () => {
            repeat(REPEAT_OPTION.daily_weekly, {
                start: at(2030, 6, 10, 9),
                end: at(2030, 6, 23, 12),
                weekdays: [
                    { ord: 1, name: 'Monday' },
                    { ord: 3, name: 'Wednesday' },
                ],
            });

            expect(dialogs.open$).toHaveBeenCalled();
            expect(days()).toEqual([10, 12, 17, 19].map((d) => at(2030, 6, d).toDateString()));
            expect(saved()[0].startDate).toEqual(at(2030, 6, 10, 9));
            expect(saved()[0].endDate).toEqual(at(2030, 6, 10, 12));
        });

        it('should fall on a day of each month', () => {
            repeat(REPEAT_OPTION.monthly, { start: at(2030, 6, 1, 8), end: at(2030, 8, 31, 10), dayOfMonth: 15 });

            expect(days()).toEqual([6, 7, 8].map((m) => at(2030, m, 15).toDateString()));
        });

        it('should fall on the second Tuesday of each month', () => {
            repeat(REPEAT_OPTION.monthly, {
                start: at(2030, 6, 1, 8),
                end: at(2030, 8, 31, 10),
                monthlyWeekday: { ord: 2, name: 'Tuesday' },
                monthlyOrdinal: { ord: 2, name: 'SECOND' },
            });

            expect(days()).toEqual([at(2030, 6, 11), at(2030, 7, 9), at(2030, 8, 13)].map((d) => d.toDateString()));
        });

        it('should count weekdays from the start of the month when starting mid-month', () => {
            // The first Tuesday of June 2030 falls before the start, so June has no first Tuesday left
            repeat(REPEAT_OPTION.monthly, {
                start: at(2030, 6, 5, 8),
                end: at(2030, 7, 31, 10),
                monthlyWeekday: { ord: 2, name: 'Tuesday' },
                monthlyOrdinal: { ord: 1, name: 'FIRST' },
            });

            expect(days()).toEqual([at(2030, 7, 2).toDateString()]);
        });

        it('should fall on the last Friday of each month', () => {
            repeat(REPEAT_OPTION.monthly, {
                start: at(2030, 6, 1, 8),
                end: at(2030, 8, 31, 10),
                monthlyWeekday: { ord: 5, name: 'Friday' },
                monthlyOrdinal: { ord: 5, name: 'LAST' },
            });

            expect(days()).toEqual([at(2030, 6, 28), at(2030, 7, 26), at(2030, 8, 30)].map((d) => d.toDateString()));
        });

        it('should fall on a date each year', () => {
            repeat(REPEAT_OPTION.yearly, {
                start: at(2030, 1, 1, 8),
                end: at(2032, 12, 31, 10),
                dayOfMonth: 6,
                yearlyMonth: { ord: 12, name: 'December' },
            });

            expect(days()).toEqual([2030, 2031, 2032].map((y) => at(y, 12, 6).toDateString()));
        });

        it('should fall on the second Tuesday of March each year', () => {
            repeat(REPEAT_OPTION.yearly, {
                start: at(2030, 1, 1, 8),
                end: at(2032, 12, 31, 10),
                monthlyWeekday: { ord: 2, name: 'Tuesday' },
                monthlyOrdinal: { ord: 2, name: 'SECOND' },
                yearlyMonth: { ord: 3, name: 'March' },
            });

            expect(days()).toEqual([at(2030, 3, 12), at(2031, 3, 11), at(2032, 3, 9)].map((d) => d.toDateString()));
        });

        it('should not be added unless confirmed', () => {
            dialogs.open$.mockReturnValueOnce(of());
            repeat(REPEAT_OPTION.monthly, { start: at(2030, 6, 1, 8), end: at(2030, 8, 31, 10), dayOfMonth: 15 });

            expect(modal.close).not.toHaveBeenCalled();
        });
    });

    it('should dismiss on cancel', () => {
        component.cancel();
        expect(modal.dismiss).toHaveBeenCalled();
    });
});
