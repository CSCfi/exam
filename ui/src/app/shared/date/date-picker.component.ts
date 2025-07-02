// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnChanges, OnInit } from '@angular/core';
import { Component, EventEmitter, Injectable, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    NgbDate,
    NgbDateParserFormatter,
    NgbDateStruct,
    NgbDatepickerI18n,
    NgbInputDatepicker,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { WeekdayNumbers } from 'luxon';
import { DateTimeService } from './date.service';

@Injectable({ providedIn: 'root' })
export class DatePickerFormatter extends NgbDateParserFormatter {
    readonly DELIMITER = '.';

    parse(value: string): NgbDateStruct {
        const date = value.split(this.DELIMITER);
        return {
            day: parseInt(date[0], 10),
            month: parseInt(date[1], 10),
            year: parseInt(date[2], 10),
        };
    }

    format(date: NgbDateStruct | null): string {
        return date ? date.day + this.DELIMITER + date.month + this.DELIMITER + date.year : '';
    }
}

@Injectable({ providedIn: 'root' })
export class DatePickerI18n extends NgbDatepickerI18n {
    constructor(
        private translate: TranslateService,
        private DateTime: DateTimeService,
    ) {
        super();
    }

    getWeekdayShortName = (weekday: WeekdayNumbers): string =>
        this.DateTime.getLocalizedDateForDay(weekday, this.getLocale()).weekdayShort as string;
    getMonthShortName = (month: number): string =>
        this.DateTime.getLocalizedDateForMonth(month, this.getLocale()).monthShort as string;
    getMonthFullName = (month: number): string =>
        this.DateTime.getLocalizedDateForMonth(month, this.getLocale()).monthLong as string;
    getDayAriaLabel = (date: NgbDateStruct): string => new Date(date.year, date.month - 1, date.day).toISOString();
    getWeekdayLabel = (weekday: WeekdayNumbers): string => this.getWeekdayShortName(weekday);

    private getLocale = (): string => {
        const lang = this.translate.currentLang;
        return `${lang.toLowerCase()}-${lang.toUpperCase()}`;
    };
}
@Component({
    selector: 'xm-date-picker',
    templateUrl: './date-picker.component.html',
    providers: [
        { provide: NgbDateParserFormatter, useClass: DatePickerFormatter },
        { provide: NgbDatepickerI18n, useClass: DatePickerI18n },
    ],
    imports: [FormsModule, NgbInputDatepicker, TranslateModule],
})
export class DatePickerComponent implements OnInit, OnChanges {
    @Input() initialDate: Date | string | number | null = null;
    @Input() initiallyEmpty = false;
    @Input() extra = false;
    @Input() extraText = '';
    @Input() modelOptions: Record<string, string> = {};
    @Input() disabled = false;
    @Input() optional = true;
    @Input() readonly = false;
    @Input() minDate?: string;
    @Input() maxDate?: string;

    @Output() updated = new EventEmitter<{ date: Date | null }>();
    @Output() extraActionHappened = new EventEmitter<{ date: Date | null }>();

    date: NgbDate | null = null;
    showWeeks = true;
    format = 'dd.MM.yyyy';
    today!: NgbDate;
    startDate!: NgbDate;
    nowDateStruct!: NgbDateStruct;
    minDateStruct!: NgbDateStruct;
    maxDateStruct!: NgbDateStruct;

    ngOnInit() {
        const now = new Date();
        const d = this.initialDate !== null ? new Date(this.initialDate) : now;
        this.today = new NgbDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
        const date = new NgbDate(d.getFullYear(), d.getMonth() + 1, d.getDate());

        if (this.minDate) {
            const minDate = new Date(Date.parse(this.minDate));
            this.minDateStruct = {
                day: minDate.getDate(),
                month: minDate.getMonth() + 1,
                year: minDate.getFullYear(),
            } as NgbDateStruct;
        } else {
            this.minDateStruct = {
                day: now.getDate(),
                month: now.getMonth() + 1,
                year: now.getFullYear() - 10,
            } as NgbDateStruct;
        }

        if (this.maxDate) {
            const maxDate = new Date(Date.parse(this.maxDate));
            this.maxDateStruct = {
                day: maxDate.getDate(),
                month: maxDate.getMonth() + 1,
                year: maxDate.getFullYear(),
            } as NgbDateStruct;
        } else {
            this.maxDateStruct = {
                day: now.getDate(),
                month: now.getMonth() + 1,
                year: now.getFullYear() + 10,
            } as NgbDateStruct;
        }

        if (!this.initiallyEmpty) {
            this.date = date;
        }
        this.startDate = date;
    }
    ngOnChanges() {
        const now = new Date();
        const d = this.initialDate !== null ? new Date(this.initialDate) : now;
        const date = new NgbDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
        if (!this.initiallyEmpty) {
            this.date = date;
        }
        this.startDate = date;
    }

    transform(value: NgbDate | null): Date | null {
        if (!value) return null;
        return new Date(value.year, value.month - 1, value.day);
    }

    dateChange() {
        const now = new Date();
        this.startDate = this.date || new NgbDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
        this.updated.emit({ date: this.transform(this.date) });
    }

    dateCleared() {
        this.updated.emit({ date: null });
    }

    extraClicked() {
        this.extraActionHappened.emit({ date: this.transform(this.date) });
    }
}
