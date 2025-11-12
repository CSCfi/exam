// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, Injectable, effect, inject, input, output, signal } from '@angular/core';
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
    private translate = inject(TranslateService);
    private DateTime = inject(DateTimeService);

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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePickerComponent {
    initialDate = input<Date | string | number | null>(null);
    initiallyEmpty = input(false);
    extra = input(false);
    extraText = input('');
    modelOptions = input<Record<string, string>>({});
    disabled = input(false);
    optional = input(true);
    readonly = input(false);
    minDate = input<string | undefined>(undefined);
    maxDate = input<string | undefined>(undefined);

    updated = output<{ date: Date | null }>();
    extraActionHappened = output<{ date: Date | null }>();

    date = signal<NgbDate | null>(null);
    showWeeks = true;
    format = 'dd.MM.yyyy';
    today = signal<NgbDate>(new NgbDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()));
    startDate = signal<NgbDate>(new NgbDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()));
    minDateStruct = signal<NgbDateStruct>({
        day: new Date().getDate(),
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear() - 10,
    });
    maxDateStruct = signal<NgbDateStruct>({
        day: new Date().getDate(),
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear() + 10,
    });

    constructor() {
        const now = new Date();
        this.today.set(new NgbDate(now.getFullYear(), now.getMonth() + 1, now.getDate()));

        // Initialize min/max date structs
        this.updateDateStructs();

        // Effect to react to input changes
        effect(() => {
            const initialDateValue = this.initialDate();
            const initiallyEmptyValue = this.initiallyEmpty();
            const minDateValue = this.minDate();
            const maxDateValue = this.maxDate();

            // Update date structs if min/max dates changed
            if (minDateValue !== undefined || maxDateValue !== undefined) {
                this.updateDateStructs();
            }

            // Update date and startDate when initialDate changes
            const now = new Date();
            const d = initialDateValue !== null ? new Date(initialDateValue) : now;
            const date = new NgbDate(d.getFullYear(), d.getMonth() + 1, d.getDate());

            if (!initiallyEmptyValue) {
                this.date.set(date);
            }
            this.startDate.set(date);
        });
    }

    transform(value: NgbDate | null): Date | null {
        if (!value) return null;
        return new Date(value.year, value.month - 1, value.day);
    }

    dateChange() {
        const now = new Date();
        const currentDate = this.date();
        this.startDate.set(currentDate || new NgbDate(now.getFullYear(), now.getMonth() + 1, now.getDate()));
        this.updated.emit({ date: this.transform(currentDate) });
    }

    setDate(value: NgbDate | null) {
        this.date.set(value);
        this.dateChange();
    }

    dateCleared() {
        this.date.set(null);
        this.updated.emit({ date: null });
    }

    extraClicked() {
        this.extraActionHappened.emit({ date: this.transform(this.date()) });
    }

    private updateDateStructs() {
        const now = new Date();
        const minDateValue = this.minDate();
        const maxDateValue = this.maxDate();

        if (minDateValue) {
            const minDate = new Date(Date.parse(minDateValue));
            this.minDateStruct.set({
                day: minDate.getDate(),
                month: minDate.getMonth() + 1,
                year: minDate.getFullYear(),
            });
        } else {
            this.minDateStruct.set({
                day: now.getDate(),
                month: now.getMonth() + 1,
                year: now.getFullYear() - 10,
            });
        }

        if (maxDateValue) {
            const maxDate = new Date(Date.parse(maxDateValue));
            this.maxDateStruct.set({
                day: maxDate.getDate(),
                month: maxDate.getMonth() + 1,
                year: maxDate.getFullYear(),
            });
        } else {
            this.maxDateStruct.set({
                day: now.getDate(),
                month: now.getMonth() + 1,
                year: now.getFullYear() + 10,
            });
        }
    }
}
