// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CommonModule } from '@angular/common';
import { Component, effect, input, output, signal, TemplateRef, untracked, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { DateTimePickerComponent } from 'src/app/shared/date/date-time-picker.component';
import { DateTimeService, REPEAT_OPTION } from 'src/app/shared/date/date.service';

export type RepetitionConfig = {
    start: Date;
    end: Date;
    weekdays: { ord: number; name: string }[];
    dayOfMonth?: number;
    monthlyOrdinal?: { name: string; ord: number };
    monthlyWeekday?: { name: string; ord: number };
    yearlyMonth?: { name: string; ord: number };
};
enum ORDINAL {
    First = 'FIRST',
    Second = 'SECOND',
    Third = 'THIRD',
    Fourth = 'FOURTH',
    Last = 'LAST',
}
const ORDINAL_MAP = Object.values(ORDINAL).map((o, i) => ({ name: o, ord: i + 1 }));

@Component({
    selector: 'xm-repetition-options',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, NgbDropdownModule, DateTimePickerComponent],
    templateUrl: './exception-repetition-options.component.html',
    styleUrls: ['../rooms/rooms.component.scss'],
    styles: '.blue-shadow-hover:hover { box-shadow: 0 0 1px 3px rgba(0, 117, 255, 1); }',
})
export class ExceptionDialogRepetitionOptionsComponent {
    @ViewChild('yearView') yearView!: TemplateRef<unknown>;
    mode = input(REPEAT_OPTION.once);
    wholeDay = input(false);
    optionChanged = output<RepetitionConfig>();

    startDate = signal(new Date());
    endDate = signal(new Date());
    wholeWeek = signal(false);
    weekdays = signal(
        this.DateTimeService.getWeekdayNames(true).map((d, i) => {
            return { selected: false, day: d, ord: i === 6 ? 0 : i + 1 }; // 1-7 mo-su converted to 0-6 su-sa
        }),
    );
    months = signal(
        this.DateTimeService.getMonthNames().map((m, i) => {
            return { selected: false, month: m, ord: i + 1 };
        }),
    );
    useOrdinals = signal(true);
    dayOfMonth = signal(1);
    monthlyOrdinal = signal(ORDINAL_MAP[0]);
    weekdayOfMonth = signal({ name: this.weekdays()[0].day, ord: this.weekdays()[0].ord });
    monthOfYear = signal({ name: this.months()[0].month, ord: this.months()[0].ord });

    ordinals = ORDINAL_MAP;
    readonly REPEAT_OPTION = REPEAT_OPTION;
    readonly ORDINAL = ORDINAL;

    constructor(private DateTimeService: DateTimeService) {
        effect(() => {
            if (this.wholeDay()) {
                untracked(() => {
                    const start = DateTime.fromJSDate(this.startDate()).startOf('day');
                    const end = DateTime.fromJSDate(this.endDate()).endOf('day');
                    this.startDate.set(start.toJSDate());
                    this.endDate.set(end.toJSDate());
                    this.optionChanged.emit(this.getConfig());
                });
            } else {
                untracked(() => {
                    this.startDate.set(DateTime.now().set({ minute: 0 }).toJSDate());
                    this.endDate.set(DateTime.now().set({ minute: 0 }).toJSDate());
                    this.optionChanged.emit(this.getConfig());
                });
            }
        });
    }

    getConfig = (): RepetitionConfig => {
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
    };

    startChanged = (e: { date: Date }) => {
        this.startDate.set(e.date);
        if (this.endDate() < e.date) {
            this.endDate.set(e.date);
        }
        this.optionChanged.emit(this.getConfig());
    };
    endChanged = (e: { date: Date }) => {
        this.endDate.set(e.date);
        if (this.startDate() > e.date) {
            this.startDate.set(e.date);
        }
        this.optionChanged.emit(this.getConfig());
    };

    weekdaySelected = (selected: boolean, index: number) => {
        const weekday = this.weekdays()[index];
        const next = this.weekdays();
        next[index] = { ...weekday, selected: !selected };
        this.weekdays.set(next);
        this.optionChanged.emit(this.getConfig());
    };

    useOrdinalsChanged = () => {
        this.useOrdinals.set(!this.useOrdinals());
        this.optionChanged.emit(this.getConfig());
    };

    dayOfMonthChanged = (event: number) => {
        this.dayOfMonth.set(event);
        this.optionChanged.emit(this.getConfig());
    };

    monthlyOrdinalChanged = (index: number) => {
        this.monthlyOrdinal.set(ORDINAL_MAP[index]);
        this.optionChanged.emit(this.getConfig());
    };

    weekdayOfMonthChanged = (index: number) => {
        this.weekdayOfMonth.set({ name: this.weekdays()[index].day, ord: this.weekdays()[index].ord });
        this.optionChanged.emit(this.getConfig());
    };

    monthOfYearChanged = (index: number) => {
        this.monthOfYear.set({ name: this.months()[index].month, ord: this.months()[index].ord });
        this.optionChanged.emit(this.getConfig());
    };

    selectWholeWeek = () => {
        this.wholeWeek.set(!this.wholeWeek());
        const week = this.weekdays().map((wd) => ({ ...wd, selected: this.wholeWeek() }));
        this.weekdays.set(week);
        this.optionChanged.emit(this.getConfig());
    };
}
