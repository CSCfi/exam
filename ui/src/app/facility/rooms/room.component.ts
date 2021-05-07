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
import { Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/angular';
import * as moment from 'moment';
import * as toast from 'toastr';

import { InteroperabilityResourceService } from './interoperabilityResource.service';
import { RoomService } from './room.service';
import { SettingsResourceService } from './settingsResource';

import type { OnInit } from '@angular/core';
import type { DefaultWorkingHours, ExceptionWorkingHours } from '../../reservation/reservation.model';
import type { InteroperableRoom, Week, Weekday, WeekdayBlock } from './room.service';

@Component({
    templateUrl: './room.component.html',
    selector: 'room',
})
export class RoomComponent implements OnInit {
    @ViewChild('roomForm', { static: false }) roomForm: NgForm;
    room: InteroperableRoom;
    week: Week;
    showName: boolean;
    isInteroperable: boolean;
    editingMultipleRooms = false;
    workingHours: WeekdayBlock[] = [];

    constructor(
        private translate: TranslateService,
        private state: StateService,
        private roomService: RoomService,
        private settings: SettingsResourceService,
        private interoperability: InteroperabilityResourceService,
    ) {}

    ngOnInit() {
        this.week = this.roomService.getWeek();
        this.showName = true;
        this.settings.examVisit().subscribe((data) => {
            this.isInteroperable = data.isExamVisitSupported;
        });

        this.roomService.getRoom(this.state.params.id).subscribe(
            (room: InteroperableRoom) => {
                room.availableForExternals = room.externalRef !== null;
                this.room = room;
                if (!this.roomService.isAnyExamMachines(this.room)) {
                    toast.warning(this.translate.instant('sitnet_room_has_no_machines_yet'));
                }
                this.room.calendarExceptionEvents.forEach((event) => {
                    this.roomService.formatExceptionEvent(event);
                });
                this.room.defaultWorkingHours.forEach((daySlot) => {
                    const timeSlots = this.slotToTimes(daySlot);
                    this.setSelected(daySlot.weekday as Weekday, timeSlots);
                });
            },
            (error) => {
                toast.error(error.data);
            },
        );
    }

    updateWorkingHours = () =>
        this.roomService
            .updateWorkingHours$(this.week, [this.room.id])
            .subscribe((hours) => (this.workingHours = hours));

    workingHoursExist = () => this.workingHours.flatMap((wh) => wh.blocks).length > 0;

    addException = (exception: ExceptionWorkingHours) => {
        this.roomService.addException([this.room.id], exception).then((data) => {
            this.roomService.formatExceptionEvent(data);
            this.room.calendarExceptionEvents.push(data);
        });
    };

    deleteException = (exception: ExceptionWorkingHours) => {
        this.roomService.deleteException(this.room.id, exception.id).then(() => {
            this.remove(this.room.calendarExceptionEvents, exception);
        });
    };

    disableRoom = () => {
        this.roomService.disableRoom(this.room);
    };

    enableRoom = () => {
        this.roomService.enableRoom(this.room);
    };

    validateInputAndUpdateRoom = (event: FocusEvent & { target: HTMLInputElement | HTMLTextAreaElement }) => {
        const { name } = event.target;
        const ctrl = this.roomForm.controls[name];
        if (ctrl.valid) {
            this.updateRoom();
        }
    };

    validateAndUpdateRoom = () => {
        if (this.roomForm.valid) {
            this.updateRoom();
        }
    };

    updateRoom = () => {
        this.roomService.updateRoom(this.room).subscribe(
            () => {
                toast.info(this.translate.instant('sitnet_room_updated'));
            },
            (error) => {
                toast.error(error.data);
            },
        );
    };

    saveRoom = () => {
        if (!this.roomService.isSomethingSelected(this.week)) {
            toast.error(this.translate.instant('sitnet_room_must_have_default_opening_hours'));
            return;
        }

        if (!this.roomService.isAnyExamMachines(this.room))
            toast.error(this.translate.instant('sitnet_dont_forget_to_add_machines') + ' ' + this.room.name);

        this.roomService.updateRoom(this.room).subscribe(
            () => {
                toast.info(this.translate.instant('sitnet_room_saved'));
                this.state.go('rooms');
            },
            (error) => {
                toast.error(error.data);
            },
        );
    };

    updateInteroperability = () => {
        this.interoperability.updateFacility(this.room).subscribe(
            (data) => {
                this.room.externalRef = data.externalRef;
                this.room.availableForExternals = data.externalRef !== null;
            },
            (err) => {
                this.room.availableForExternals = !this.room.availableForExternals;
                toast.error(err.data.message);
            },
        );
    };

    private remove = (arr: unknown[], item: unknown) => {
        const index = arr.indexOf(item);
        arr.splice(index, 1);
    };

    private setSelected = (day: Weekday, slots: number[]) => {
        for (let i = 0; i < slots.length; ++i) {
            if (this.week[day][slots[i]]) {
                this.week[day][slots[i]].type = 'selected';
            }
        }
    };

    private slotToTimes = (slot: DefaultWorkingHours) => {
        const arr = [];
        const startKey = moment(slot.startTime).format('H:mm');
        const endKey = moment(slot.endTime).format('H:mm');
        const times = this.roomService.getTimes();
        const start = startKey === '0:00' ? 0 : times.indexOf(startKey);
        for (let i = start; i < times.length; i++) {
            if (times[i] === endKey) {
                break;
            }
            arr.push(i);
        }
        return arr;
    };
}
