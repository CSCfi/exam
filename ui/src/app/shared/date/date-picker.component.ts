// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    ChangeDetectionStrategy,
    Component,
    Injectable,
    computed,
    inject,
    input,
    linkedSignal,
    output,
    signal,
} from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
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
    private readonly translate = inject(TranslateService);
    private readonly DateTime = inject(DateTimeService);

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
    imports: [FormField, NgbInputDatepicker, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePickerComponent {
    readonly initialDate = input<Date | string | number | null>(null);
    readonly initiallyEmpty = input(false);
    readonly extra = input(false);
    readonly extraText = input('');
    readonly modelOptions = input<Record<string, string>>({});
    readonly disabled = input(false);
    readonly optional = input(true);
    readonly isReadonly = input(false);
    readonly minDate = input<string | undefined>(undefined);
    readonly maxDate = input<string | undefined>(undefined);

    readonly updated = output<{ date: Date | null }>();
    readonly extraActionHappened = output<{ date: Date | null }>();

    readonly dateForm = form(
        linkedSignal<{ date: NgbDate | null }>(() => {
            const initialDateValue = this.initialDate();
            const d = initialDateValue !== null ? new Date(initialDateValue) : new Date();
            const date = new NgbDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
            return this.initiallyEmpty() ? { date: null } : { date };
        }),
    );
    readonly today = signal<NgbDate>(
        new NgbDate(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()),
    );
    readonly startDate = linkedSignal<NgbDate>(() => {
        const initialDateValue = this.initialDate();
        const d = initialDateValue !== null ? new Date(initialDateValue) : new Date();
        return new NgbDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
    });
    readonly minDateStruct = computed<NgbDateStruct>(() => {
        const minDateValue = this.minDate();
        if (minDateValue) {
            const minDate = new Date(Date.parse(minDateValue));
            return { day: minDate.getDate(), month: minDate.getMonth() + 1, year: minDate.getFullYear() };
        }
        const now = new Date();
        return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() - 10 };
    });
    readonly maxDateStruct = computed<NgbDateStruct>(() => {
        const maxDateValue = this.maxDate();
        if (maxDateValue) {
            const maxDate = new Date(Date.parse(maxDateValue));
            return { day: maxDate.getDate(), month: maxDate.getMonth() + 1, year: maxDate.getFullYear() };
        }
        const now = new Date();
        return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() + 10 };
    });
    readonly showWeeks = true;
    readonly format = 'dd.MM.yyyy';

    transform(value: NgbDate | null): Date | null {
        if (!value) return null;
        return new Date(value.year, value.month - 1, value.day);
    }

    dateChange() {
        const now = new Date();
        const currentDate = this.dateForm.date().value();
        this.startDate.set(currentDate || new NgbDate(now.getFullYear(), now.getMonth() + 1, now.getDate()));
        this.updated.emit({ date: this.transform(currentDate) });
    }

    setDate(value: NgbDate | null) {
        this.dateForm.date().value.set(value);
        this.dateChange();
    }

    dateCleared() {
        this.dateForm.date().value.set(null);
        this.updated.emit({ date: null });
    }

    extraClicked() {
        this.extraActionHappened.emit({ date: this.transform(this.dateForm.date().value()) });
    }
}
