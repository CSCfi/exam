// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NgbActiveModal, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { RepetitionConfig } from 'src/app/facility/facility.model';
import { ExceptionWorkingHours } from 'src/app/reservation/reservation.model';
import { DateTimeService, REPEAT_OPTION } from 'src/app/shared/date/date.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { groupBy } from 'src/app/shared/miscellaneous/helpers';
import { ExceptionDialogRepetitionOptionsComponent } from './exception-repetition-options.component';

@Component({
    imports: [TranslateModule, ExceptionDialogRepetitionOptionsComponent, NgbDropdownModule],
    templateUrl: './exception-dialog.component.html',
    styleUrls: ['../rooms/rooms.component.scss'],
    styles: '.blue-shadow-hover:hover { box-shadow: 0 0 1px 3px rgba(0, 117, 255, 1); }',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExceptionDialogComponent {
    outOfService = input(true);
    exceptions = input<ExceptionWorkingHours[]>([]);

    dateFormat = 'yyyy.MM.dd HH:mm';
    wholeDay = signal(false);
    repeatOptions: REPEAT_OPTION[] = Object.values(REPEAT_OPTION);
    repeats = signal<REPEAT_OPTION>(REPEAT_OPTION.once);
    options = signal<RepetitionConfig>({ start: new Date(), end: new Date(), weekdays: [] });

    readonly REPEAT_OPTION = REPEAT_OPTION;

    private translate = inject(TranslateService);
    private activeModal = inject(NgbActiveModal);
    private toast = inject(ToastrService);
    private dateTime = inject(DateTimeService);
    private dialogs = inject(ConfirmationDialogService);

    ok() {
        const currentOptions = this.options();
        if (currentOptions.start >= currentOptions.end) {
            this.toast.error(this.translate.instant('i18n_endtime_before_starttime'));
            return;
        }
        switch (this.repeats()) {
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
    }

    cancel() {
        this.activeModal.dismiss();
    }

    optionChanged(option: RepetitionConfig) {
        this.options.set(option);
    }

    toggleWholeDay() {
        this.wholeDay.update((v) => !v);
    }

    setRepeats(value: REPEAT_OPTION) {
        this.repeats.set(value);
    }

    private repeatOnce() {
        const startDate = DateTime.fromJSDate(this.options().start);
        const endDate = DateTime.fromJSDate(this.options().end);
        const result: ExceptionWorkingHours[] = [
            {
                id: 0,
                startDate: startDate.toISO()!,
                startDateTimezoneOffset: startDate.offset,
                endDate: endDate.toISO()!,
                endDateTimezoneOffset: endDate.offset,
                outOfService: this.outOfService(),
            },
        ];
        const overlapCheck = [{ start: this.options().start, end: this.options().end }];
        if (this.isOverlapping(this.exceptions(), overlapCheck)) {
            return;
        }
        this.activeModal.close(result);
    }

    private repeatWeekly() {
        const currentOptions = this.options();
        const weekdays = currentOptions.weekdays.map((wd) => wd.ord);
        const interval = this.dateTime.eachDayOfInterval(currentOptions.start, currentOptions.end);
        const matches = interval.filter((d) => weekdays.includes(d.weekday));

        const result = this.parseExceptionDays(matches);
        const translations = this.dateTime.getWeekdayNames(true).map((d, i) => {
            return { name: d, number: i === 6 ? 0 : i + 1 }; // 1-7 mo-su converted to 0-6 su-sa
        });
        const message = translations.filter((d) => weekdays.includes(d.number)).map((d) => ' ' + d.name) + '.';
        this.endDialogue(message, result);
    }

    private repeatMonthly() {
        const currentOptions = this.options();
        const interval = this.dateTime.eachDayOfInterval(currentOptions.start, currentOptions.end);
        const matches = currentOptions.dayOfMonth
            ? interval.filter((d) => d.day === currentOptions.dayOfMonth) // day of month
            : this.groupByMonth(
                  interval.filter((d) => d.weekday === currentOptions.monthlyWeekday?.ord),
                  currentOptions.monthlyOrdinal?.ord as number,
                  currentOptions.start,
              );

        const result = this.parseExceptionDays(matches);
        const message =
            this.translate.instant('i18n_of_month') +
            ' ' +
            (currentOptions.dayOfMonth
                ? currentOptions.dayOfMonth + '. ' + this.translate.instant('i18n_day')
                : this.translate.instant('i18n_' + currentOptions.monthlyOrdinal?.name.toLowerCase()) +
                  ' ' +
                  currentOptions.monthlyWeekday?.name) +
            '.';
        this.endDialogue(message, result);
    }

    private repeatYearly() {
        const currentOptions = this.options();
        const interval = this.dateTime.eachDayOfInterval(currentOptions.start, currentOptions.end);
        const matches = currentOptions.dayOfMonth
            ? interval
                  .filter((d) => d.day === currentOptions.dayOfMonth)
                  .filter((d) => d.month === currentOptions.yearlyMonth?.ord)
            : this.groupByMonth(
                  interval.filter((d) => d.weekday === currentOptions.monthlyWeekday?.ord),
                  currentOptions.monthlyOrdinal?.ord as number,
                  currentOptions.start,
              ).filter((d) => d.month === currentOptions.yearlyMonth?.ord);
        const message = [
            this.translate.instant('i18n_year').toLowerCase(),
            currentOptions.yearlyMonth?.name,
            currentOptions.dayOfMonth
                ? `${currentOptions.dayOfMonth}.${this.translate.instant('i18n_day')}`
                : `${this.translate.instant('i18n_' + currentOptions.monthlyOrdinal?.name.toLowerCase()).toLowerCase()} ${currentOptions.monthlyWeekday?.name}`,
        ].join(' ');
        this.endDialogue(message, this.parseExceptionDays(matches));
    }

    private groupByMonth(dates: DateTime[], ord: number, min: Date) {
        const currentOptions = this.options();
        const minDateTime = DateTime.fromJSDate(min);
        const datesFromBeginningOfMonth = dates.concat(
            this.dateTime
                .eachDayOfInterval(minDateTime.startOf('month').toJSDate(), minDateTime.minus({ days: 1 }).toJSDate())
                .filter((d) => d.weekday === currentOptions.monthlyWeekday?.ord),
        );
        const grouped = groupBy(datesFromBeginningOfMonth, (d) => d.month.toString());
        const index = (xs: unknown[]) => {
            if (ord == 5) return xs.length - 1;
            else if (ord - 1 > xs.length - 1) return -1;
            else return ord - 1;
        };
        return Object.values(grouped)
            .filter((ds) => !!ds)
            .filter((ds) => index(ds as unknown[]) >= 0)
            .map((ds) => {
                const ds2 = (ds as DateTime[]).sort((a, b) => a.toMillis() - b.toMillis());
                return ds2[index(ds2)];
            })
            .filter((d) => d && d.toJSDate() >= min);
    }

    private parseExceptionDays(exceptionDays: DateTime[]) {
        const currentOptions = this.options();
        return exceptionDays.map((day) => ({
            start: day
                .set({ hour: currentOptions.start.getHours(), minute: currentOptions.start.getMinutes() })
                .toJSDate(),
            end: day.set({ hour: currentOptions.end.getHours(), minute: currentOptions.end.getMinutes() }).toJSDate(),
        }));
    }

    private endDialogue(repetitionMessage: string, result: { start: Date; end: Date }[]) {
        if (this.isOverlapping(this.exceptions(), result)) {
            return;
        }
        const currentOptions = this.options();
        const results = result.map((r) => ({ startDate: r.start, endDate: r.end, outOfService: this.outOfService() }));
        const msg = [
            this.translate.instant('i18n_confirm_adding_x'),
            results.length,
            this.outOfService()
                ? this.translate.instant('i18n_x_out_of_service_exceptions')
                : this.translate.instant('i18n_x_in_service_exceptions'),
            this.translate.instant('i18n_and_repeats_every_x'),
            repetitionMessage,
            this.translate.instant('i18n_exception_happens_at'),
            DateTime.fromJSDate(currentOptions.start).toLocaleString(DateTime.TIME_24_SIMPLE),
            '-',
            DateTime.fromJSDate(currentOptions.end).toLocaleString(DateTime.TIME_24_SIMPLE),
        ].join(' ');
        this.dialogs.open$(this.translate.instant('i18n_confirm'), msg).subscribe({
            next: () => this.activeModal.close(results),
        });
    }

    private isOverlapping(existing: ExceptionWorkingHours[], fresh: { start: Date; end: Date }[]) {
        const intervals = existing.map((oe) => ({ start: oe.startDate, end: oe.endDate }));
        const overlaps =
            intervals.length > 0 &&
            fresh.some((f) =>
                intervals.some((i) =>
                    this.dateTime.intervalsOverlap(f, { start: new Date(i.start), end: new Date(i.end) }),
                ),
            );
        if (overlaps) {
            this.toast.error(this.translate.instant('i18n_room_closed_overlap'));
            return true;
        }
        return false;
    }
}
