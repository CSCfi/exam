// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnChanges, OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    NgbDropdown,
    NgbDropdownItem,
    NgbDropdownMenu,
    NgbDropdownToggle,
    NgbTimepicker,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { areIntervalsOverlapping, formatISO, setDayOfYear } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { DefaultWorkingHoursWithEditing } from 'src/app/facility/facility.model';
import { RoomService } from 'src/app/facility/rooms/room.service';
import { DefaultWorkingHours, ExamRoom } from 'src/app/reservation/reservation.model';
import { DateTimeService } from 'src/app/shared/date/date.service';
interface RoomWithAddressVisibility extends ExamRoom {
    addressVisible: boolean;
    availabilityVisible: boolean;
    extendedDwh: DefaultWorkingHoursWithEditing[];
}
@Component({
    selector: 'xm-opening-hours',
    template: `
        @for (dwh of orderByWeekday(extendedRoom.extendedDwh); track dwh) {
            <div class="row mt-1 d-flex align-content-center">
                <div class="col-2 align-self-center">
                    {{ dateTime.translateWeekdayName(dwh.weekday, true) }}
                </div>
                <div class="col row">
                    @if (!dwh.editing) {
                        <div class="col d-flex justify-content-around align-self-center">
                            <div>{{ workingHourFormat(dwh.displayStartingTime) }}</div>
                            <div class="align-self-center">-</div>
                            <div>{{ workingHourFormat(dwh.displayEndingTime) }}</div>
                        </div>
                    }
                    @if (dwh.editing) {
                        <div class="col d-flex justify-content-around align-self-center">
                            <ngb-timepicker
                                name="timepicker"
                                size="small"
                                [minuteStep]="15"
                                [(ngModel)]="dwh.pickStartingTime"
                            ></ngb-timepicker>
                            <div class="align-self-center">-</div>
                            <ngb-timepicker
                                name="timepicker"
                                size="small"
                                [minuteStep]="15"
                                [(ngModel)]="dwh.pickEndingTime"
                            ></ngb-timepicker>
                        </div>
                    }
                </div>
                <div class="col-2 align-self-center">
                    @if (!dwh.editing) {
                        <div class="bi-pencil-fill pointer align-self-center" (click)="dwh.editing = true"></div>
                    }
                    @if (dwh.editing) {
                        <div class="d-flex">
                            <div
                                class="ms-1 bi-x-square-fill text-muted pointer align-self-center"
                                (click)="dwh.editing = false"
                            ></div>
                            <div
                                class="ms-1 bi-check-circle-fill text-success pointer align-self-center"
                                (click)="updateHours(dwh)"
                            ></div>
                            <div
                                class="ms-1 bi-trash text-danger pointer align-self-center"
                                (click)="deleteHours(dwh)"
                            ></div>
                        </div>
                    }
                </div>
            </div>
        }
        <div class="row mt-1 d-flex align-content-center">
            <span class="col-2 align-self-center min-w-100" ngbDropdown>
                <button
                    ngbDropdownToggle
                    class="btn btn-outline-dark"
                    type="button"
                    id="dropDownMenu1"
                    aria-expanded="true"
                >
                    {{ dateTime.translateWeekdayName(newTime.weekday, true) }}&nbsp;<span class="caret"></span>
                </button>
                <div ngbDropdownMenu role="menu" aria-labelledby="dropDownMenu1">
                    @for (weekday of WEEKDAYS; track weekday) {
                        <button
                            ngbDropdownItem
                            role="presentation"
                            class="pointer"
                            (click)="updateNewTime(weekday)"
                            (keydown.enter)="updateNewTime(weekday)"
                        >
                            {{ dateTime.translateWeekdayName(weekday, true) }}
                        </button>
                    }
                </div>
            </span>
            <div class="col row">
                <div class="col d-flex justify-content-around align-self-center">
                    <ngb-timepicker
                        name="timepicker"
                        size="small"
                        [minuteStep]="15"
                        [(ngModel)]="newTime.pickStartingTime"
                        (ngModelChange)="onStartTimeChange()"
                    ></ngb-timepicker>
                    <div class="align-self-center">-</div>
                    <ngb-timepicker
                        name="timepicker"
                        size="small"
                        [minuteStep]="15"
                        [(ngModel)]="newTime.pickEndingTime"
                        (ngModelChange)="onEndTimeChange()"
                    ></ngb-timepicker>
                </div>
            </div>
            <div class="col-2 align-self-center">
                <div
                    class="bi-plus-circle-fill text-success pointer align-self-center"
                    (click)="updateHours(newTime)"
                ></div>
            </div>
        </div>
    `,
    standalone: true,
    imports: [NgbTimepicker, FormsModule, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem],
})
export class OpenHoursComponent implements OnInit, OnChanges {
    @Input() room!: ExamRoom;

    weekdayNames: string[] = [];
    extendedRoom!: RoomWithAddressVisibility;
    newTime: DefaultWorkingHoursWithEditing;
    NEW_TIME = {
        startTime: '',
        endTime: '',
        weekday: 'MONDAY',
        editing: false,
        pickStartingTime: {
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
        },
        pickEndingTime: {
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
        },
        displayStartingTime: {
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
        },
        displayEndingTime: {
            hour: 0,
            minute: 0,
            second: 0,
            millisecond: 0,
        },
    };
    WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    constructor(
        private roomService: RoomService,
        public dateTime: DateTimeService,
        private translate: TranslateService,
        private toast: ToastrService,
    ) {
        this.newTime = { ...this.NEW_TIME };
    }

    ngOnInit() {
        this.translate.onLangChange.subscribe(() => (this.weekdayNames = this.dateTime.getWeekdayNames()));
        this.weekdayNames = this.dateTime.getWeekdayNames();
        this.init();
    }

    ngOnChanges() {
        this.init();
    }

    orderByWeekday = (dwhs: DefaultWorkingHoursWithEditing[]) => {
        const ordinal = (dwh: DefaultWorkingHours) => this.WEEKDAYS.indexOf(dwh.weekday);
        return dwhs.sort((a, b) => ordinal(a) - ordinal(b));
    };

    updateHours(wh: DefaultWorkingHoursWithEditing) {
        if (this.overlaps(wh)) {
            this.toast.error(this.translate.instant(this.translate.instant('i18n_time_overlaps_error')));
            return;
        }
        const start = formatISO(
            setDayOfYear(new Date().setHours(wh.pickStartingTime.hour, wh.pickStartingTime.minute, 0, 0), 1),
        );
        const end = formatISO(
            setDayOfYear(new Date().setHours(wh.pickEndingTime.hour, wh.pickEndingTime.minute, 0, 0), 1),
        );
        if (new Date(start) > new Date(end)) {
            this.toast.error(this.translate.instant(this.translate.instant('i18n_starting_cannot_be_after_ending')));
            return;
        }
        const id = wh.id;
        this.roomService
            .updateWorkingHours$({ startTime: start, endTime: end, weekday: wh.weekday }, [this.room.id])
            .subscribe((data) => {
                wh.id = data.id;
                wh.editing = false;
                if (!id) {
                    this.extendedRoom = {
                        ...this.extendedRoom,
                        extendedDwh: this.extendedRoom.extendedDwh.concat(wh),
                    };
                    this.newTime = { ...this.NEW_TIME };
                }
                this.toast.info(this.translate.instant('i18n_default_opening_hours_updated'));
            });
        wh.displayStartingTime = wh.pickStartingTime;
        wh.displayEndingTime = wh.pickEndingTime;
    }

    deleteHours(wh: DefaultWorkingHoursWithEditing) {
        if (!wh.id) return;
        return this.roomService.removeWorkingHours$(wh.id, this.room.id).subscribe(() => {
            const index = this.extendedRoom.extendedDwh.indexOf(wh);
            this.extendedRoom.extendedDwh.splice(index, 1);
            this.toast.info(this.translate.instant('i18n_default_opening_hours_updated'));
        });
    }

    workingHourFormat(time: { hour: number; minute: number }): string {
        const zeropad = (n: number) => (String(n).length > 1 ? n.toString() : '0' + n.toString());
        return `${zeropad(time.hour)}:${zeropad(time.minute)}`;
    }

    updateNewTime = (weekday: string) => (this.newTime.weekday = weekday);

    onStartTimeChange() {
        if (
            this.newTime.pickStartingTime.hour * 100 + this.newTime.pickStartingTime.minute >
            this.newTime.pickEndingTime.hour * 100 + this.newTime.pickEndingTime.minute
        ) {
            this.newTime.pickEndingTime = this.newTime.pickStartingTime;
        }
    }

    onEndTimeChange() {
        if (
            this.newTime.pickStartingTime.hour * 100 + this.newTime.pickStartingTime.minute >
            this.newTime.pickEndingTime.hour * 100 + this.newTime.pickEndingTime.minute
        ) {
            this.newTime.pickStartingTime = this.newTime.pickEndingTime;
        }
    }

    init = () =>
        (this.extendedRoom = {
            ...this.room,
            addressVisible: false,
            availabilityVisible: false,
            extendedDwh: this.room.defaultWorkingHours.map((wh) => {
                return {
                    ...wh,
                    editing: false,
                    pickStartingTime: {
                        hour: new Date(wh.startTime).getHours(),
                        minute: new Date(wh.startTime).getMinutes(),
                        second: 0,
                        millisecond: 0,
                    },
                    pickEndingTime: {
                        hour: new Date(wh.endTime).getHours(),
                        minute: new Date(wh.endTime).getMinutes(),
                        second: 0,
                        millisecond: 0,
                    },
                    displayStartingTime: {
                        hour: new Date(wh.startTime).getHours(),
                        minute: new Date(wh.startTime).getMinutes(),
                        second: 0,
                        millisecond: 0,
                    },
                    displayEndingTime: {
                        hour: new Date(wh.endTime).getHours(),
                        minute: new Date(wh.endTime).getMinutes(),
                        second: 0,
                        millisecond: 0,
                    },
                };
            }),
        });

    private toDate = (time: { hour: number; minute: number }) =>
        setDayOfYear(new Date().setHours(time.hour, time.minute, 0, 0), 1);

    private overlaps = (wh: DefaultWorkingHoursWithEditing) => {
        const newInterval = { start: this.toDate(wh.pickStartingTime), end: this.toDate(wh.pickEndingTime) };
        const intervals = this.extendedRoom.extendedDwh
            .filter((dwh) => dwh.weekday === wh.weekday && dwh !== wh)
            .map((dwh) => ({ start: this.toDate(dwh.pickStartingTime), end: this.toDate(dwh.pickEndingTime) }));
        return intervals.some((i) => areIntervalsOverlapping(i, newInterval, { inclusive: true }));
    };
}
