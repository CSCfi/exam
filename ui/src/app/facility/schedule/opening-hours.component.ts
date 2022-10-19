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
import type { OnChanges, OnInit } from '@angular/core';
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { areIntervalsOverlapping, formatISO, setDayOfYear } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { DefaultWorkingHours, ExamRoom } from '../../reservation/reservation.model';
import { DateTimeService } from '../../shared/date/date.service';
import { RoomService } from '../rooms/room.service';
import { DefaultWorkingHoursWithEditing } from '../rooms/rooms.component';
interface RoomWithAddressVisibility extends ExamRoom {
    addressVisible: boolean;
    availabilityVisible: boolean;
    extendedDwh: DefaultWorkingHoursWithEditing[];
}
@Component({
    selector: 'xm-opening-hours',
    template: `
        <div class="row mart10 flex align-content-center" *ngFor="let dwh of orderByWeekday(extendedRoom.extendedDwh)">
            <div class="col-2 min-w-100 align-self-center">{{ dateTime.translateWeekdayName(dwh.weekday, true) }}</div>
            <div class="col row">
                <div class="col flex justify-content-around align-self-center" *ngIf="!dwh.editing">
                    <div>{{ workingHourFormat(dwh.pickStartingTime) }}</div>
                    <div class="align-self-center">-</div>
                    <div>{{ workingHourFormat(dwh.pickEndingTime) }}</div>
                </div>
                <div class="col flex justify-content-around align-self-center" *ngIf="dwh.editing">
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
                <div
                    class="col-2 bi-pencil-fill pointer align-self-center"
                    *ngIf="!dwh.editing"
                    (click)="dwh.editing = true"
                ></div>
                <div
                    class="col-1 bi-x-square-fill text-muted pointer align-self-center"
                    *ngIf="dwh.editing"
                    (click)="dwh.editing = false"
                ></div>
                <div
                    class="col-1 bi-check-circle-fill text-success pointer align-self-center"
                    *ngIf="dwh.editing"
                    (click)="updateHours(dwh)"
                ></div>
                <div
                    class="col-1 bi-trash text-danger pointer align-self-center"
                    *ngIf="dwh.editing"
                    (click)="deleteHours(dwh)"
                ></div>
            </div>
        </div>
        <div class="row mart10 flex align-content-center">
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
                <ul ngbDropdownMenu role="menu" aria-labelledby="dropDownMenu1">
                    <li
                        ngbDropdownItem
                        *ngFor="let weekday of WEEKDAYS"
                        role="presentation"
                        class="pointer"
                        (click)="updateNewTime(weekday)"
                        (keydown.enter)="updateNewTime(weekday)"
                        tabindex="0"
                    >
                        <a role="menuitem" title="{{ dateTime.translateWeekdayName(weekday, true) }}">{{
                            dateTime.translateWeekdayName(weekday, true)
                        }}</a>
                    </li>
                </ul>
            </span>
            <div class="col row">
                <div class="col flex justify-content-around align-self-center">
                    <ngb-timepicker
                        name="timepicker"
                        size="small"
                        [minuteStep]="15"
                        [(ngModel)]="newTime.pickStartingTime"
                    ></ngb-timepicker>
                    <div class="align-self-center">-</div>
                    <ngb-timepicker
                        name="timepicker"
                        size="small"
                        [minuteStep]="15"
                        [(ngModel)]="newTime.pickEndingTime"
                    ></ngb-timepicker>
                </div>
                <div
                    class="col-2 bi-plus-circle-fill text-success pointer align-self-center"
                    (click)="updateHours(newTime)"
                ></div>
            </div>
        </div>
    `,
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
            this.toast.error(this.translate.instant('Time range overlaps with another one. Please check your inputs'));
            return;
        }
        const start = formatISO(
            setDayOfYear(new Date().setHours(wh.pickStartingTime.hour, wh.pickStartingTime.minute, 0, 0), 1),
        );
        const end = formatISO(
            setDayOfYear(new Date().setHours(wh.pickEndingTime.hour, wh.pickEndingTime.minute, 0, 0), 1),
        );
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
                this.toast.info(this.translate.instant('sitnet_default_opening_hours_updated'));
            });
    }

    deleteHours(wh: DefaultWorkingHoursWithEditing) {
        if (!wh.id) return;
        return this.roomService.removeWorkingHours$(wh.id).subscribe(() => {
            const index = this.extendedRoom.extendedDwh.indexOf(wh);
            this.extendedRoom.extendedDwh.splice(index, 1);
            this.toast.info(this.translate.instant('sitnet_default_opening_hours_updated'));
        });
    }

    workingHourFormat(time: { hour: number; minute: number }): string {
        const zeropad = (n: number) => (String(n).length > 1 ? n.toString() : '0' + n.toString());
        return `${zeropad(time.hour)}:${zeropad(time.minute)}`;
    }

    updateNewTime = (weekday: string) => (this.newTime.weekday = weekday);

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
                };
            }),
        });

    private toDate = (time: { hour: number; minute: number }) =>
        setDayOfYear(new Date().setHours(time.hour, time.minute, 0, 0), 1);

    private overlaps = (wh: DefaultWorkingHoursWithEditing) => {
        const newInterval = { start: this.toDate(wh.pickStartingTime), end: this.toDate(wh.pickEndingTime) };
        const intervals = this.extendedRoom.extendedDwh
            .filter((dwh) => dwh.weekday === wh.weekday)
            .map((dwh) => ({ start: this.toDate(dwh.pickStartingTime), end: this.toDate(dwh.pickEndingTime) }));
        return intervals.some((i) => areIntervalsOverlapping(i, newInterval, { inclusive: true }));
    };
}
