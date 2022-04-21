/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import type { OnInit } from '@angular/core';
import { Component, EventEmitter, Injectable, Input, Output } from '@angular/core';
import type { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { NgbDate, NgbDateParserFormatter, NgbDatepickerI18n } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { DateTimeService } from './date.service';

@Injectable()
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

@Injectable()
export class DatePickerI18n extends NgbDatepickerI18n {
    constructor(private translate: TranslateService, private DateTime: DateTimeService) {
        super();
    }

    getWeekdayShortName = (weekday: number): string =>
        this.getTranslation({ weekday: 'short' }, weekday, this.DateTime.getDateForWeekday);
    getMonthShortName = (month: number): string =>
        this.getTranslation({ month: 'short' }, month - 1, this.DateTime.getDateForMonth);
    getMonthFullName = (month: number): string =>
        this.getTranslation({ month: 'long' }, month - 1, this.DateTime.getDateForMonth);
    getDayAriaLabel = (date: NgbDateStruct): string => new Date(date.year, date.month - 1, date.day).toISOString();
    getWeekdayLabel = (weekday: number): string => this.getWeekdayShortName(weekday);

    private getTranslation = (options: Intl.DateTimeFormatOptions, ord: number, fn: (n: number) => Date): string => {
        const lang = this.translate.currentLang;
        const locale = `${lang.toLowerCase()}-${lang.toUpperCase()}`;
        return fn(ord).toLocaleDateString(locale, options);
    };
}
@Component({
    selector: 'xm-date-picker',
    templateUrl: './date-picker.component.html',
    providers: [
        { provide: NgbDateParserFormatter, useClass: DatePickerFormatter },
        { provide: NgbDatepickerI18n, useClass: DatePickerI18n },
    ],
})
export class DatePickerComponent implements OnInit {
    @Input() initialDate: Date | string | number | null = null;
    @Input() initiallyEmpty = false;
    @Input() extra = false;
    @Input() extraText = '';
    @Input() modelOptions: Record<string, string> = {};
    @Input() disabled = false;
    @Input() optional = true;
    @Input() examMaxDate?: string;

    @Output() updated = new EventEmitter<{ date: Date | null }>();
    @Output() extraActionHappened = new EventEmitter<{ date: Date | null }>();

    date: NgbDate | null = null;
    showWeeks = true;
    format = 'dd.MM.yyyy';
    today!: NgbDate;
    startDate!: NgbDate;
    nowDateStruct!: NgbDateStruct;
    maxDateStruct!: NgbDateStruct;

    ngOnInit() {
        const now = new Date();
        const d = this.initialDate !== null ? new Date(this.initialDate) : now;
        this.today = new NgbDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
        const date = new NgbDate(d.getFullYear(), d.getMonth() + 1, d.getDate());

        if (this.examMaxDate) {
            const maxDate = new Date(Date.parse(this.examMaxDate)).getTime() - new Date(0).getTime();
            const maxDateInit = new Date(now.getTime() + maxDate);
            this.maxDateStruct = {
                day: maxDateInit.getDate(),
                month: maxDateInit.getMonth() + 1,
                year: maxDateInit.getFullYear(),
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

    transform(value: NgbDate | null): Date | null {
        if (!value) return null;
        return new Date(value.year, value.month - 1, value.day);
    }

    dateChange() {
        const now = new Date();
        this.startDate = this.date || new NgbDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
        this.updated.emit({ date: this.transform(this.date) });
    }

    extraClicked() {
        this.extraActionHappened.emit({ date: this.transform(this.date) });
    }
}
