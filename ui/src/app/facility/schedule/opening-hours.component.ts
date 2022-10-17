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
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { ExamRoom } from '../../reservation/reservation.model';
import { DateTimeService } from '../../shared/date/date.service';
import type { Week } from '../rooms/room.service';
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
        <div class="row mart10 flex align-content-center" *ngFor="let dwh of extendedRoom?.extendedDwh">
            <div class="col-2 min-w-100 align-self-center">{{ dateTime.translateWeekdayName(dwh.weekday, true) }}</div>
            <div class="col row">
                <div class="col flex justify-content-around align-self-center" *ngIf="!dwh.editing">
                    <div>{{ workingHourFormat(dwh.startTime) }}</div>
                    <div class="align-self-center">-</div>
                    <div>{{ workingHourFormat(dwh.endTime) }}</div>
                </div>
                <div class="col flex justify-content-around align-self-center" *ngIf="dwh.editing">
                    <ngb-timepicker
                        name="timepicker"
                        size="small"
                        [minuteStep]="15"
                        [(ngModel)]="dwh.pickStartingTime"
                        (ngModelChange)="updateStartingEdits(dwh, $event)"
                    ></ngb-timepicker>
                    <div class="align-self-center">-</div>
                    <ngb-timepicker
                        name="timepicker"
                        size="small"
                        [minuteStep]="15"
                        [(ngModel)]="dwh.pickEndingTime"
                        (ngModelChange)="updateEndingEdits(dwh, $event)"
                    ></ngb-timepicker>
                </div>
                <div
                    class="col-2 bi-pencil-fill pointer align-self-center"
                    *ngIf="!dwh.editing"
                    (click)="startEditing(dwh)"
                ></div>
                <div
                    class="col-1 bi-check-circle-fill text-success pointer align-self-center"
                    *ngIf="dwh.editing"
                    (click)="saveEdits(dwh)"
                ></div>
                <div
                    class="col-1 bi-trash text-danger pointer align-self-center"
                    *ngIf="dwh.editing"
                    (click)="deleteDwh(dwh)"
                ></div>
            </div>
        </div>
        <div class="row mart10 flex align-content-center">
            <span class="col-2 align-self-center min-w-100" ngbDropdown>
                <button
                    ngbDropdownToggle
                    class="background-none radius-3 pad0"
                    type="button"
                    id="dropDownMenu1"
                    aria-expanded="true"
                >
                    {{ dateTime.translateWeekdayName(newTime.weekday, true) }}&nbsp;<span class="caret"></span>
                </button>
                <ul
                    ngbDropdownMenu
                    style="padding-left: 0; min-width: 17em"
                    role="menu"
                    aria-labelledby="dropDownMenu1"
                >
                    <li
                        ngbDropdownItem
                        *ngFor="let weekday of getWeekdays()"
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
                        (ngModelChange)="updateStartingEdits(newTime, $event)"
                    ></ngb-timepicker>
                    <div class="align-self-center">-</div>
                    <ngb-timepicker
                        name="timepicker"
                        size="small"
                        [minuteStep]="15"
                        [(ngModel)]="newTime.pickEndingTime"
                        (ngModelChange)="updateEndingEdits(newTime, $event)"
                    ></ngb-timepicker>
                </div>
                <div
                    class="col-2 bi-plus-circle-fill text-success pointer align-self-center"
                    (click)="saveEdits(newTime)"
                ></div>
            </div>
        </div>
    `,
})
export class OpenHoursComponent implements OnInit {
    @Input() room?: ExamRoom;
    @Output() selected = new EventEmitter();

    week: Week = {};
    weekdayNames: string[] = [];
    times: string[] = [];
    extendedRoom?: RoomWithAddressVisibility;
    newTime: DefaultWorkingHoursWithEditing;

    constructor(
        private roomService: RoomService,
        public dateTime: DateTimeService,
        private translate: TranslateService,
    ) {
        this.newTime = {
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
    }

    ngOnInit() {
        if (!this.room) {
            console.error('No [room] for opening-hours.component');
            return;
        }
        this.translate.onLangChange.subscribe(() => {
            this.weekdayNames = this.dateTime.getWeekdayNames();
        });
        this.week = this.roomService.getWeek();
        this.weekdayNames = this.dateTime.getWeekdayNames();
        this.times = this.roomService.getTimes();
        const defaultWorkingHours = this.room.defaultWorkingHours;
        this.extendedRoom = {
            ...this.room,
            addressVisible: false,
            availabilityVisible: false,
            extendedDwh: defaultWorkingHours.map((wh) => {
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
        } as RoomWithAddressVisibility;
    }

    timeRange = () => {
        return [...new Array(this.times.length - 1)].map((x: undefined, i: number) => i);
    };

    getWeekdays = () => {
        return Object.keys(this.week);
    };

    getType = (day: string, time: number) => {
        this.week;
        return this.week[day][time].type;
    };

    calculateTime = (index: number) => {
        return (this.times[index] || '0:00') + ' - ' + this.times[index + 1];
    };

    selectSlot = (day: string, time: number) => {
        const status = this.week[day][time].type;
        if (status === 'accepted') {
            // clear selection
            this.week[day][time].type = '';
            return;
        }
        if (status === 'selected') {
            // mark everything hereafter as free until next block
            for (let i = 0; i < this.week[day].length; ++i) {
                if (i >= time) {
                    if (this.week[day][i].type === 'selected') {
                        this.week[day][i].type = '';
                    } else {
                        break;
                    }
                }
            }
        } else {
            // check if something is accepted yet
            let accepted;
            for (let i = 0; i < this.week[day].length; ++i) {
                if (this.week[day][i].type === 'accepted') {
                    accepted = i;
                    break;
                }
            }
            if (accepted && accepted >= 0) {
                // mark everything between accepted and this as selected
                if (accepted < time) {
                    for (let i = accepted; i <= time; ++i) {
                        this.week[day][i].type = 'selected';
                    }
                } else {
                    for (let i = time; i <= accepted; ++i) {
                        this.week[day][i].type = 'selected';
                    }
                }
            } else {
                this.week[day][time].type = 'accepted'; // mark beginning
            }
        }

        this.selected.emit();
    };
    startEditing = (wh: DefaultWorkingHoursWithEditing) => (wh.editing = true);
    updateStartingEdits(
        wh: DefaultWorkingHoursWithEditing,
        event: { hour: number; minute: number; second: number; millisecond?: number },
    ) {
        wh.pickStartingTime = event;
        //wh.startTime = new Date().toDateString()
    }
    updateEndingEdits(
        wh: DefaultWorkingHoursWithEditing,
        event: { hour: number; minute: number; second: number; millisecond?: number },
    ) {
        wh.pickEndingTime = event;
    }
    saveEdits(wh: DefaultWorkingHoursWithEditing) {
        this.selected.emit();
        wh.editing = false;
    }
    deleteDwh(wh: DefaultWorkingHoursWithEditing) {
        //TODO
    }
    workingHourFormat(time: string): string {
        return format(new Date(time), 'HH:mm');
    }
    getDateForWeekday(ordinal: number): Date {
        const now = new Date();
        const distance = ordinal - now.getDay();
        return new Date(now.setDate(now.getDate() + distance));
    }
    updateNewTime(weekday: string) {
        this.newTime.weekday = weekday;
    }
}
