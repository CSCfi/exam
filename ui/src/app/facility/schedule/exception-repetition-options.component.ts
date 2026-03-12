// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { RepetitionConfig } from 'src/app/facility/facility.model';
import { DateTimePickerComponent } from 'src/app/shared/date/date-time-picker.component';
import { DateTimeService, REPEAT_OPTION } from 'src/app/shared/date/date.service';

enum ORDINAL {
    First = 'FIRST',
    Second = 'SECOND',
    Third = 'THIRD',
    Fourth = 'FOURTH',
    Last = 'LAST',
}
const ORDINAL_MAP = Object.values(ORDINAL).map((o, i) => ({ name: o, ord: i + 1 }));

interface WeekdayOption {
    selected: boolean;
    day: string;
    ord: number;
}

interface MonthOption {
    selected: boolean;
    month: string;
    ord: number;
}

interface WeekdayOfMonth {
    name: string;
    ord: number;
}

interface MonthOfYear {
    name: string;
    ord: number;
}

@Component({
    selector: 'xm-repetition-options',
    imports: [CommonModule, TranslateModule, NgbDropdownModule, DateTimePickerComponent],
    templateUrl: './exception-repetition-options.component.html',
    styleUrls: ['../rooms/rooms.component.scss'],
    styles: '.blue-shadow-hover:hover { box-shadow: 0 0 1px 3px rgba(0, 117, 255, 1); }',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExceptionDialogRepetitionOptionsComponent {
    readonly mode = input(REPEAT_OPTION.once);
    readonly wholeDay = input(false);
    readonly optionChanged = output<RepetitionConfig>();

    readonly startDate = signal(new Date());
    readonly endDate = signal(new Date());
    readonly wholeWeek = signal(false);
    readonly weekdays = signal<WeekdayOption[]>([]);
    readonly months = signal<MonthOption[]>([]);
    readonly useOrdinals = signal(true);
    readonly dayOfMonth = signal(1);
    readonly monthlyOrdinal = signal(ORDINAL_MAP[0]);
    readonly weekdayOfMonth = signal<WeekdayOfMonth>({ name: '', ord: 0 });
    readonly monthOfYear = signal<MonthOfYear>({ name: '', ord: 0 });

    readonly ordinals = ORDINAL_MAP;
    readonly REPEAT_OPTION = REPEAT_OPTION;

    private readonly DateTimeService = inject(DateTimeService);

    constructor() {
        // Initialize signals that depend on DateTimeService
        this.weekdays.set(
            this.DateTimeService.getWeekdayNames(true).map((d, i) => {
                return { selected: false, day: d, ord: i === 6 ? 0 : i + 1 }; // 1-7 mo-su converted to 0-6 su-sa
            }),
        );
        this.months.set(
            this.DateTimeService.getMonthNames().map((m, i) => {
                return { selected: false, month: m, ord: i + 1 };
            }),
        );
        this.weekdayOfMonth.set({ name: this.weekdays()[0].day, ord: this.weekdays()[0].ord });
        this.monthOfYear.set({ name: this.months()[0].month, ord: this.months()[0].ord });
        effect(() => {
            if (this.wholeDay()) {
                // Track startDate and endDate to react to changes
                const currentStart = this.startDate();
                const currentEnd = this.endDate();
                const start = DateTime.fromJSDate(currentStart).startOf('day');
                const end = DateTime.fromJSDate(currentEnd).endOf('day');
                const startJs = start.toJSDate();
                const endJs = end.toJSDate();
                // Only update if the times have actually changed
                if (currentStart.getTime() !== startJs.getTime()) {
                    this.startDate.set(startJs);
                }
                if (currentEnd.getTime() !== endJs.getTime()) {
                    this.endDate.set(endJs);
                }
                // getConfig() reads many signals we don't want to track
                untracked(() => {
                    this.optionChanged.emit(this.getConfig());
                });
            }
        });
    }

    onDayOfMonthInput = (event: Event) => this.dayOfMonthChanged(+(event.target as HTMLInputElement).value);

    getConfig(): RepetitionConfig {
        const conf: RepetitionConfig = {
            start: this.startDate(),
            end: this.endDate(),
            weekdays: this.weekdays()
                .filter((wd) => wd.selected)
                .map((wd) => ({ ord: wd.ord, name: wd.day })),
            yearlyMonth: this.monthOfYear(),
        };
        if ((this.mode() === REPEAT_OPTION.monthly || this.mode() === REPEAT_OPTION.yearly) && !this.useOrdinals()) {
            return { ...conf, dayOfMonth: this.dayOfMonth() };
        } else if (this.useOrdinals()) {
            return {
                ...conf,
                dayOfMonth: undefined,
                monthlyOrdinal: this.monthlyOrdinal(),
                monthlyWeekday: this.weekdayOfMonth(),
            };
        }
        return conf;
    }

    startChanged(e: { date: Date }) {
        this.startDate.set(e.date);
        if (this.endDate() < e.date) {
            this.endDate.set(e.date);
        }
        this.optionChanged.emit(this.getConfig());
    }

    endChanged(e: { date: Date }) {
        this.endDate.set(e.date);
        if (this.startDate() > e.date) {
            this.startDate.set(e.date);
        }
        this.optionChanged.emit(this.getConfig());
    }

    weekdaySelected(selected: boolean, index: number) {
        const weekday = this.weekdays()[index];
        this.weekdays.update((weekdays) => {
            const updated = [...weekdays];
            updated[index] = { ...weekday, selected: !selected };
            return updated;
        });
        this.optionChanged.emit(this.getConfig());
    }

    setUseOrdinals(value: boolean) {
        this.useOrdinals.set(value);
        this.optionChanged.emit(this.getConfig());
    }

    dayOfMonthChanged(event: number) {
        this.dayOfMonth.set(event);
        this.optionChanged.emit(this.getConfig());
    }

    monthlyOrdinalChanged(index: number) {
        this.monthlyOrdinal.set(ORDINAL_MAP[index]);
        this.optionChanged.emit(this.getConfig());
    }

    weekdayOfMonthChanged(index: number) {
        this.weekdayOfMonth.set({ name: this.weekdays()[index].day, ord: this.weekdays()[index].ord });
        this.optionChanged.emit(this.getConfig());
    }

    monthOfYearChanged(index: number) {
        this.monthOfYear.set({ name: this.months()[index].month, ord: this.months()[index].ord });
        this.optionChanged.emit(this.getConfig());
    }

    selectWholeWeek() {
        this.wholeWeek.update((v) => !v);
        const wholeWeekValue = this.wholeWeek();
        this.weekdays.update((weekdays) => weekdays.map((wd) => ({ ...wd, selected: wholeWeekValue })));
        this.optionChanged.emit(this.getConfig());
    }
}
