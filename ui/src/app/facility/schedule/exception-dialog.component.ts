import { formatDate, NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbTimepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { areIntervalsOverlapping, eachDayOfInterval } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { range } from 'ramda';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { DateTimePickerComponent } from 'src/app/shared/date/date-time-picker.component';
import { ExceptionWorkingHours } from '../../reservation/reservation.model';
import { DateTimeService, REPEAT_OPTIONS } from '../../shared/date/date.service';
import { ConfirmationDialogService } from '../../shared/dialogs/confirmation-dialog.service';

enum ORDINAL {
    First = 'FIRST',
    Second = 'SECOND',
    Third = 'THIRD',
    Fourth = 'FOURTH',
    Last = 'LAST',
}

@Component({
    standalone: true,
    imports: [FormsModule, TranslateModule, NgClass, DateTimePickerComponent, DatePickerComponent, NgbTimepickerModule],
    templateUrl: './exception-dialog.component.html',
})
export class ExceptionDialogComponent {
    @Input() outOfService = true;
    @Input() exceptions: ExceptionWorkingHours[] = [];
    dateOptions = {
        'starting-day': 1,
    };
    dateFormat = 'yyyy.MM.dd HH:mm';
    startDate: Date = new Date();
    endDate: Date = new Date();
    date: Date = new Date();
    startTime: { hour: number; minute: number; second: number };
    endTime: { hour: number; minute: number; second: number };
    wholeDay = false;
    weekdayOfMonth: { selected: boolean; day: string; number: number };
    monthOfYear: { selected: boolean; month: string; number: number };
    dayOfMonth = 1;
    selectableWeekDays: { selected: boolean; day: string; number: number }[];
    selectableMonths: { selected: boolean; month: string; number: number }[];
    repeatOptions: REPEAT_OPTIONS[] = Object.values(REPEAT_OPTIONS);
    repeats: REPEAT_OPTIONS = REPEAT_OPTIONS.once;
    isNumericNotWeekday = true;
    weeks = [range(1, 8), range(8, 15), range(15, 22), range(22, 29)];
    ordinals: { ordinal: string; number: number }[] = Object.values(ORDINAL).map((o, i) => ({ ordinal: o, number: i }));
    selectedOrdinal: { ordinal: string; number: number };

    constructor(
        private translate: TranslateService,
        private activeModal: NgbActiveModal,
        private toast: ToastrService,
        private dateTime: DateTimeService,
        private dialogs: ConfirmationDialogService,
    ) {
        this.startDate.setMinutes(60, 0);
        this.endDate.setMinutes(60, 0);
        this.selectableWeekDays = this.dateTime.getWeekdayNames(true).map((d, i) => {
            return { selected: true, day: d, number: i === 6 ? 0 : i + 1 }; // 1-7 mo-su converted to 0-6 su-sa
        });
        this.weekdayOfMonth = this.selectableWeekDays[0];
        this.selectableMonths = this.dateTime.getMonthNames().map((m, i) => {
            return { selected: true, month: m, number: i + 1 };
        });
        this.monthOfYear = this.selectableMonths[0];
        this.selectedOrdinal = this.ordinals[0];
        this.startTime = { hour: this.date.getHours(), minute: 0, second: 0 };
        this.endTime = { hour: this.date.getHours(), minute: 0, second: 0 };
    }

    ok = () => {
        if (this.wholeDay) {
            this.startDate.setHours(0, 0, 0);
            this.endDate.setHours(23, 59, 59);
            this.startTime.hour = 0;
            this.startTime.minute = 0;
            this.endTime.hour = 23;
            this.endTime.minute = 59;
        }
        if (
            this.repeats === REPEAT_OPTIONS.once
                ? this.startDate >= this.endDate
                : this.startTime.hour * 100 + this.startTime.minute >= this.endTime.hour * 100 + this.endTime.minute ||
                  new Date(this.startDate.getFullYear(), this.startDate.getMonth() + 1, this.startDate.getDate()) >
                      new Date(this.endDate.getFullYear(), this.endDate.getMonth() + 1, this.endDate.getDate())
        ) {
            this.toast.error(this.translate.instant('i18n_endtime_before_starttime'));
            return;
        }
        switch (this.repeats.toString()) {
            case 'ONCE': {
                this.repeatOnce();
                break;
            }
            case 'DAILY_WEEKLY': {
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

    repeatOnce() {
        const result = [
            {
                startDate: this.startDate,
                endDate: this.endDate,
                outOfService: this.outOfService,
            },
        ];
        if (this.isOverlapping(this.exceptions, result)) {
            return;
        }
        this.activeModal.close(result);
    }
    repeatWeekly() {
        const wkd = this.selectableWeekDays.filter((d) => d.selected).map((d) => d.number);
        const weeklyExceptions = this.getFilteredExceptionDates(wkd);
        const result = this.parseExceptionDays(weeklyExceptions);
        const message =
            this.selectableWeekDays
                .filter((d) => d.selected)
                .map((d) => ' ' + d.day)
                .toString() + '.';
        this.endDialogue(message, result);
    }
    repeatMonthly() {
        const monthlyExceptions = this.getFilteredExceptionDates().filter((date) =>
            this.isNumericNotWeekday ? true : this.weekdayOfMonth.number === date.getDay(),
        );
        const result = this.parseExceptionDays(monthlyExceptions);
        const message =
            this.translate.instant('i18n_of_month') +
            ' ' +
            (this.isNumericNotWeekday
                ? this.dayOfMonth + '. ' + this.translate.instant('i18n_day')
                : this.translate.instant('i18n_' + this.selectedOrdinal.ordinal.toLowerCase()) +
                  ' ' +
                  this.weekdayOfMonth.day) +
            '.';
        this.endDialogue(message, result);
    }

    repeatYearly() {
        const yearlyExceptions = this.getFilteredExceptionDates()
            .filter((date) => (this.isNumericNotWeekday ? true : this.weekdayOfMonth.number === date.getDay()))
            .filter((date) => this.monthOfYear.number === date.getMonth() + 1);
        const result = this.parseExceptionDays(yearlyExceptions);
        const message =
            this.translate.instant('i18n_year').toLowerCase() +
            ' ' +
            this.monthOfYear.month +
            ' ' +
            (this.isNumericNotWeekday
                ? this.dayOfMonth + '. ' + this.translate.instant('i18n_day')
                : this.translate.instant('i18n_' + this.selectedOrdinal.ordinal.toLowerCase()).toLowerCase() +
                  ' ' +
                  this.weekdayOfMonth.day) +
            '.';
        this.endDialogue(message, result);
    }

    isOverlapping(
        oldExceptions: ExceptionWorkingHours[],
        newExceptions: { startDate: Date; endDate: Date; outOfService: boolean }[],
    ): boolean {
        const overlapExceptions = oldExceptions.filter((exception) =>
            newExceptions
                .map((newException) =>
                    areIntervalsOverlapping(
                        { start: new Date(exception.startDate), end: new Date(exception.endDate) },
                        { start: newException.startDate, end: newException.endDate },
                    ),
                )
                .includes(true),
        );
        if (overlapExceptions.length > 0) {
            const message =
                this.translate.instant('i18n_room_closed_overlap') +
                ': ' +
                overlapExceptions
                    .map(
                        (e) =>
                            e.ownerRoom ||
                            this.translate.instant('i18n_this_room') +
                                ': ' +
                                formatDate(e.startDate, this.dateFormat, this.translate.currentLang) +
                                '-' +
                                formatDate(e.endDate, this.dateFormat, this.translate.currentLang),
                    )
                    .toString();
            this.toast.error(message);
            return true;
        }
        return false;
    }

    endDialogue(repetitionMessage: string, result: { startDate: Date; endDate: Date; outOfService: boolean }[]) {
        if (this.isOverlapping(this.exceptions, result)) {
            return;
        }
        this.dialogs
            .open$(
                this.translate.instant('i18n_confirm'),
                this.translate.instant('i18n_confirm_adding_x') +
                    ' ' +
                    result.length +
                    ' ' +
                    this.translate.instant('i18n_x_exceptions') +
                    ' ' +
                    this.translate.instant('i18n_and_repeats_every_x') +
                    ' ' +
                    repetitionMessage +
                    ' ' +
                    this.translate.instant('i18n_exception_happens_at') +
                    ' ' +
                    this.startTime.hour +
                    ':' +
                    (this.startTime.minute.toString().length === 1 ? '0' : '') +
                    this.startTime.minute +
                    ' - ' +
                    this.endTime.hour +
                    ':' +
                    (this.endTime.minute.toString().length === 1 ? '0' : '') +
                    this.endTime.minute +
                    '.',
            )
            .subscribe({
                next: () => this.activeModal.close(result),
                error: (err) => this.toast.error(err),
            });
    }

    cancel = () => {
        this.activeModal.dismiss();
    };

    getFilteredExceptionDates(selectedWeekdays?: number[]): Date[] {
        const suitableDays = this.isNumericNotWeekday ? [this.dayOfMonth] : this.weeks[this.selectedOrdinal.number];
        return eachDayOfInterval({
            start: this.startDate,
            end: this.endDate,
        }).filter((date) => {
            if (selectedWeekdays) {
                return [...selectedWeekdays].includes(date.getDay());
            }
            return this.selectedOrdinal.number === 4
                ? this.calculateLastWeek(date).includes(date.getDate())
                : suitableDays.includes(date.getDate());
        });
    }

    calculateLastWeek = (date: Date): number[] => {
        const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const result: number[] = [];
        for (let i = d.getDate(); i > d.getDate() - 7; i--) {
            result.push(i);
        }
        return result;
    };

    parseExceptionDays(exceptionDays: Date[]): {
        startDate: Date;
        endDate: Date;
        outOfService: boolean;
    }[] {
        return exceptionDays.map((day) => {
            const startDate = new Date(day);
            startDate.setHours(this.startTime.hour, this.startTime.minute);
            const endDate = new Date(day);
            endDate.setHours(this.endTime.hour, this.endTime.minute);
            return {
                startDate: startDate,
                endDate: endDate,
                outOfService: this.outOfService,
            };
        });
    }

    onStartTimeDateChange = (e: { date: Date }) => {
        this.startDate = new Date(e.date);
        if (this.endDate < e.date) {
            this.endDate = new Date(e.date);
        }
    };
    onEndTimeDateChange = (e: { date: Date }) => {
        this.endDate = new Date(e.date);
        if (this.startDate > e.date) {
            this.startDate = new Date(e.date);
        }
    };

    onStartDateChange(e: { date: Date | null }) {
        if (e.date) {
            this.startDate = new Date(e.date);
            if (this.endDate < e.date) {
                this.endDate = new Date(e.date);
            }
        }
    }

    onEndDateChange(e: { date: Date | null }) {
        if (e.date) {
            this.endDate = new Date(e.date);
            if (this.startDate > e.date) {
                this.startDate = new Date(e.date);
            }
        }
    }

    onStartTimeChange() {
        if (this.startTime.hour * 100 + this.startTime.minute > this.endTime.hour * 100 + this.endTime.minute) {
            this.endTime = this.startTime;
        }
    }

    onEndTimeChange() {
        if (this.startTime.hour * 100 + this.startTime.minute > this.endTime.hour * 100 + this.endTime.minute) {
            this.startTime = this.endTime;
        }
    }

    updateRepeatOption(select: REPEAT_OPTIONS) {
        this.repeats = select;
    }

    selectWholeWeek() {
        const toggle = !this.selectableWeekDays[0].selected;
        this.selectableWeekDays.forEach((d) => {
            d.selected = toggle;
        });
    }

    updateDayOfMonth(selectedWeekday: { selected: boolean; day: string; number: number }) {
        this.weekdayOfMonth = selectedWeekday;
    }
    updateMonthOfYear(selectedMonth: { selected: boolean; month: string; number: number }) {
        this.monthOfYear = selectedMonth;
    }
    updateOrdinal(selectedOrdinal: { ordinal: string; number: number }) {
        this.selectedOrdinal = selectedOrdinal;
    }
}
