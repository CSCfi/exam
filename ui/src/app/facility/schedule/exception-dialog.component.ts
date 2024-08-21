// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import { NgbActiveModal, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addDays, areIntervalsOverlapping, eachDayOfInterval, getDate, getDay, getMonth, startOfMonth } from 'date-fns';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { groupBy } from 'ramda';
import { ExceptionWorkingHours } from 'src/app/reservation/reservation.model';
import { DateTimeService, REPEAT_OPTION } from 'src/app/shared/date/date.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ExceptionDialogRepetitionOptionsComponent, RepetitionConfig } from './exception-repetition-options.component';

@Component({
    standalone: true,
    imports: [TranslateModule, ExceptionDialogRepetitionOptionsComponent, NgbDropdownModule],
    templateUrl: './exception-dialog.component.html',
    styleUrls: ['../rooms/rooms.component.scss'],
    styles: '.blue-shadow-hover:hover { box-shadow: 0 0 1px 3px rgba(0, 117, 255, 1); }',
})
export class ExceptionDialogComponent {
    @Input() outOfService = true;
    @Input() exceptions: ExceptionWorkingHours[] = [];
    dateFormat = 'yyyy.MM.dd HH:mm';
    wholeDay = false;
    repeatOptions: REPEAT_OPTION[] = Object.values(REPEAT_OPTION);
    repeats: REPEAT_OPTION = REPEAT_OPTION.once;
    options: RepetitionConfig = { start: new Date(), end: new Date(), weekdays: [] };

    readonly REPEAT_OPTION = REPEAT_OPTION;

    constructor(
        private translate: TranslateService,
        private activeModal: NgbActiveModal,
        private toast: ToastrService,
        private dateTime: DateTimeService,
        private dialogs: ConfirmationDialogService,
    ) {}

    ok = () => {
        if (this.options.start >= this.options.end) {
            this.toast.error(this.translate.instant('i18n_endtime_before_starttime'));
            return;
        }
        switch (this.repeats) {
            case REPEAT_OPTION.once: {
                this.repeatOnce();
                break;
            }
            case REPEAT_OPTION.daily_weekly: {
                this.repeatWeekly();
                break;
            }
            case 'MONTHLY': {
                this.repeatMonthly();
                break;
            }
            case 'YEARLY': {
                this.repeatYearly();
                break;
            }
            default: {
                console.error('No repetition value!');
                this.activeModal.close();
            }
        }
    };

    cancel = () => {
        this.activeModal.dismiss();
    };

    optionChanged = (option: RepetitionConfig) => {
        this.options = option;
    };

    private repeatOnce() {
        const result = [
            {
                start: this.options.start,
                end: this.options.end,
            },
        ];
        if (this.isOverlapping(this.exceptions, result)) {
            return;
        }
        this.activeModal.close(result);
    }

    private repeatWeekly() {
        const weekdays = this.options.weekdays.map((wd) => wd.ord);
        const interval = eachDayOfInterval({ start: this.options.start, end: this.options.end });
        const matches = interval.filter((d) => weekdays.includes(getDay(d)));

        const result = this.parseExceptionDays(matches);
        const translations = this.dateTime.getWeekdayNames(true).map((d, i) => {
            return { name: d, number: i === 6 ? 0 : i + 1 }; // 1-7 mo-su converted to 0-6 su-sa
        });
        const message = translations.filter((d) => weekdays.includes(d.number)).map((d) => ' ' + d.name) + '.';
        this.endDialogue(message, result);
    }

    private repeatMonthly() {
        const interval = eachDayOfInterval({ start: this.options.start, end: this.options.end });
        const matches = this.options.dayOfMonth
            ? interval.filter((d) => getDate(d) === this.options.dayOfMonth) // day of month
            : this.groupByMonth(
                  interval.filter((d) => getDay(d) === this.options.monthlyWeekday?.ord),
                  this.options.monthlyOrdinal?.ord as number,
                  this.options.start,
              );

        const result = this.parseExceptionDays(matches);
        const message =
            this.translate.instant('i18n_of_month') +
            ' ' +
            (this.options.dayOfMonth
                ? this.options.dayOfMonth + '. ' + this.translate.instant('i18n_day')
                : this.translate.instant('i18n_' + this.options.monthlyOrdinal?.name.toLowerCase()) +
                  ' ' +
                  this.options.monthlyWeekday?.name) +
            '.';
        this.endDialogue(message, result);
    }

    private repeatYearly() {
        const interval = eachDayOfInterval({ start: this.options.start, end: this.options.end });
        const matches = this.options.dayOfMonth
            ? interval
                  .filter((d) => getDate(d) === this.options.dayOfMonth)
                  .filter((d) => getMonth(d) + 1 === this.options.yearlyMonth?.ord)
            : this.groupByMonth(
                  interval.filter((d) => getDay(d) === this.options.monthlyWeekday?.ord),
                  this.options.monthlyOrdinal?.ord as number,
                  this.options.start,
              ).filter((d) => getMonth(d) + 1 === this.options.yearlyMonth?.ord);
        const message = [
            this.translate.instant('i18n_year').toLowerCase(),
            this.options.yearlyMonth?.name,
            this.options.dayOfMonth
                ? `${this.options.dayOfMonth}.${this.translate.instant('i18n_day')}`
                : `${this.translate.instant('i18n_' + this.options.monthlyOrdinal?.name.toLowerCase()).toLowerCase()} ${this.options.monthlyWeekday?.name}`,
        ].join(' ');
        this.endDialogue(message, this.parseExceptionDays(matches));
    }

    private groupByMonth(dates: Date[], ord: number, min: Date) {
        const datesFromBeginningOfMonth = dates.concat(
            eachDayOfInterval({ start: startOfMonth(min), end: addDays(min, -1) }).filter(
                (d) => getDay(d) === this.options.monthlyWeekday?.ord,
            ),
        );
        const grouped = groupBy((d) => getMonth(d).toString(), datesFromBeginningOfMonth);
        const index = (xs: unknown[]) => {
            if (ord == 5) return xs.length - 1;
            else if (ord - 1 > xs.length - 1) return -1;
            else return ord - 1;
        };
        return Object.values(grouped)
            .filter((ds) => !!ds)
            .filter((ds) => index(ds as unknown[]) >= 0)
            .map((ds) => {
                const ds2 = (ds as Date[]).sort();
                return ds2[index(ds2)];
            })
            .filter((d) => d >= min);
    }

    private parseExceptionDays = (exceptionDays: Date[]) =>
        exceptionDays.map((day) => ({
            start: DateTime.fromJSDate(day)
                .set({ hour: this.options.start.getHours(), minute: this.options.start.getMinutes() })
                .toJSDate(),
            end: DateTime.fromJSDate(day)
                .set({ hour: this.options.end.getHours(), minute: this.options.end.getMinutes() })
                .toJSDate(),
        }));

    private endDialogue(repetitionMessage: string, result: { start: Date; end: Date }[]) {
        if (this.isOverlapping(this.exceptions, result)) {
            return;
        }
        const results = result.map((r) => ({ startDate: r.start, endDate: r.end, outOfService: this.outOfService }));
        const msg = [
            this.translate.instant('i18n_confirm_adding_x'),
            results.length,
            this.translate.instant('i18n_x_exceptions'),
            this.translate.instant('i18n_and_repeats_every_x'),
            repetitionMessage,
            this.translate.instant('i18n_exception_happens_at'),
            DateTime.fromJSDate(this.options.start).toLocaleString(DateTime.TIME_24_SIMPLE),
            '-',
            DateTime.fromJSDate(this.options.end).toLocaleString(DateTime.TIME_24_SIMPLE),
        ].join(' ');
        this.dialogs.open$(this.translate.instant('i18n_confirm'), msg).subscribe({
            next: () => this.activeModal.close(results),
        });
    }

    private isOverlapping = (existing: ExceptionWorkingHours[], fresh: { start: Date; end: Date }[]) => {
        const intervals = existing.map((oe) => ({ start: oe.startDate, end: oe.endDate }));
        const overlaps =
            intervals.length > 0 && fresh.every((f) => !intervals.some((oi) => areIntervalsOverlapping(f, oi)));
        if (overlaps) {
            this.toast.error(this.translate.instant('i18n_room_closed_overlap'));
            return true;
        }
        return false;
    };
}
