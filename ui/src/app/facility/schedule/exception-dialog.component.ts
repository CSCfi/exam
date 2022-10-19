import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { eachDayOfInterval } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { range } from 'ramda';
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
    templateUrl: './exception-dialog.component.html',
})
export class ExceptionDialogComponent {
    dateOptions = {
        'starting-day': 1,
    };
    dateFormat = 'dd.MM.yyyy';
    exception: {
        startDate: Date;
        endDate: Date;
        outOfService: boolean;
    };
    date: Date = new Date();
    startTime: { hour: number; minute: number; second: number };
    endTime: { hour: number; minute: number; second: number };
    wholeDay: boolean = false;
    weekdayOfMonth: { selected: boolean; day: string; number: number };
    monthOfYear: { selected: boolean; month: string; number: number };
    dayOfMonth = 1;
    selectableWeekDays: { selected: boolean; day: string; number: number }[];
    selectableMonths: { selected: boolean; month: string; number: number }[];
    repeatOptions: REPEAT_OPTIONS[] = Object.values(REPEAT_OPTIONS);
    repeats: REPEAT_OPTIONS = REPEAT_OPTIONS.once;
    repeatEvery = 1;
    isNumericNotWeekday = true;
    weeks = [range(1, 7), range(8, 14), range(15, 21), range(22, 28)];
    ordinals: { ordinal: string; number: number }[] = Object.values(ORDINAL).map((o, i) => ({ ordinal: o, number: i }));
    selectedOrdinal: { ordinal: string; number: number };

    constructor(
        private translate: TranslateService,
        private activeModal: NgbActiveModal,
        private toast: ToastrService,
        private dateTime: DateTimeService,
        private dialogs: ConfirmationDialogService,
    ) {
        const now = new Date();
        now.setMinutes(60);
        now.setSeconds(0);
        now.setMilliseconds(0);
        this.exception = {
            startDate: now,
            endDate: now,
            outOfService: true,
        };
        this.selectableWeekDays = this.dateTime.getWeekdayNames(true).map((d, i) => {
            return { selected: true, day: d, number: i === 7 ? 0 : i + 1 }; // 1-7 mo-su converted to 0-6 su-sa
        });
        this.weekdayOfMonth = this.selectableWeekDays[0];
        this.selectableMonths = this.dateTime.getMonthNames(true).map((m, i) => {
            return { selected: true, month: m, number: i + 1 };
        });
        this.monthOfYear = this.selectableMonths[0];
        this.selectedOrdinal = this.ordinals[0];
        this.startTime = { hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() };
        this.endTime = { hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() };
    }

    ok = () => {
        if (this.wholeDay) this.setWholeDay([this.exception]);
        const startDate = this.exception.startDate;
        const endDate = this.exception.endDate;
        if (
            this.repeats === REPEAT_OPTIONS.once
                ? startDate >= endDate
                : this.startTime.hour * 100 + this.startTime.minute >= this.endTime.hour * 100 + this.endTime.minute ||
                  new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) >
                      new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
        ) {
            this.toast.error(this.translate.instant('sitnet_endtime_before_starttime'));
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
                startDate: this.exception.startDate,
                endDate: this.exception.endDate,
                outOfService: this.exception.outOfService,
            },
        ];
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
            this.isNumericNotWeekday ? true : [this.weekdayOfMonth.number].includes(date.getDay()),
        );
        const result = this.parseExceptionDays(monthlyExceptions);
        const message =
            this.translate.instant('sitnet_of_month') +
            ' ' +
            (this.isNumericNotWeekday
                ? this.dayOfMonth + '. ' + this.translate.instant('sitnet_day')
                : this.translate.instant('sitnet_' + this.selectedOrdinal.ordinal.toLowerCase()) +
                  ' ' +
                  this.weekdayOfMonth.day) +
            '.';
        this.endDialogue(message, result);
    }

    repeatYearly() {
        const yearlyExceptions = this.getFilteredExceptionDates()
            .filter((date) => (this.isNumericNotWeekday ? true : [this.weekdayOfMonth.number].includes(date.getDay())))
            .filter((date) => [this.monthOfYear.number].includes(date.getMonth() + 1));
        const result = this.parseExceptionDays(yearlyExceptions);
        const message =
            this.translate.instant('sitnet_year').toLowerCase() +
            ' ' +
            this.monthOfYear.month +
            ' ' +
            (this.isNumericNotWeekday
                ? this.dayOfMonth + '. ' + this.translate.instant('sitnet_day')
                : this.translate.instant('sitnet_' + this.selectedOrdinal.ordinal.toLowerCase()).toLowerCase() +
                  ' ' +
                  this.weekdayOfMonth.day) +
            '.';
        this.endDialogue(message, result);
    }

    endDialogue(repetitionMessage: string, result: { startDate: Date; endDate: Date; outOfService: boolean }[]) {
        this.dialogs
            .open$(
                this.translate.instant('sitnet_confirm'),
                this.translate.instant('sitnet_confirm_adding_x') +
                    ' ' +
                    result.length +
                    ' ' +
                    this.translate.instant('sitnet_x_exceptions') +
                    ' ' +
                    this.translate.instant('sitnet_and_repeats_every_x') +
                    ' ' +
                    repetitionMessage +
                    ' ' +
                    this.translate.instant('sitnet_exception_happens_at') +
                    ' ' +
                    this.startTime.hour +
                    ':' +
                    (this.startTime.minute.toString().length === 1 && '0') +
                    this.startTime.minute +
                    ' - ' +
                    this.endTime.hour +
                    ':' +
                    (this.startTime.minute.toString().length === 1 && '0') +
                    this.endTime.minute +
                    '.',
            )
            .subscribe({
                next: () => this.activeModal.close(result),
                error: this.toast.error,
            });
    }

    cancel = () => {
        this.activeModal.dismiss();
    };

    setWholeDay(
        exceptions: {
            startDate: Date;
            endDate: Date;
            outOfService: boolean;
        }[],
    ) {
        exceptions.forEach((exception) => {
            exception.startDate.setHours(0);
            exception.startDate.setMinutes(0);
            exception.startDate.setSeconds(0);
            exception.endDate.setHours(23);
            exception.endDate.setMinutes(59);
            exception.endDate.setSeconds(60);
        });
        this.startTime.hour = 0;
        this.startTime.minute = 0;
        this.endTime.hour = 24;
        this.endTime.minute = 0;
    }

    getFilteredExceptionDates(selectedWeekdays?: number[]): Date[] {
        const suitableDays = this.isNumericNotWeekday ? [this.dayOfMonth] : this.weeks[this.selectedOrdinal.number];
        return eachDayOfInterval({
            start: this.exception.startDate,
            end: this.exception.endDate,
        }).filter((date) => {
            const filter = this.calculateLastWeek(date);
            if (this.selectedOrdinal.number === 4) {
                return filter.includes(date.getDate());
            }
            return !!selectedWeekdays
                ? [...selectedWeekdays].includes(date.getDay())
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
            startDate.setHours(this.startTime.hour);
            startDate.setMinutes(this.startTime.minute);
            const endDate = new Date(day);
            endDate.setHours(this.endTime.hour);
            endDate.setMinutes(this.endTime.minute);
            return {
                startDate: startDate,
                endDate: endDate,
                outOfService: this.exception.outOfService,
            };
        });
    }

    onStartTimeDateChange = (e: { date: Date }) => {
        this.exception.startDate = e.date;
        if (this.exception.endDate < this.exception.startDate) {
            this.exception.endDate = e.date;
        }
    };
    onEndTimeDateChange = (e: { date: Date }) => {
        this.exception.endDate = e.date;
    };

    onStartDateChange(e: { date: Date | null }) {
        if (e.date) {
            this.exception.startDate = e.date;
        }
    }

    onEndDateChange(e: { date: Date | null }) {
        if (e.date) {
            this.exception.endDate = e.date;
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
