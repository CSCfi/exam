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
import { Component } from '@angular/core';
import { orderBy } from 'lodash';
import { ToastrService } from 'ngx-toastr';
import type { ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';
import type { Week } from './room.service';
import { RoomService } from './room.service';

@Component({
    selector: 'xm-exception-mass-edit',
    template: `<div id="sitnet-header" class="header">
            <div class="col-md-12 header-wrapper">
                <span class="header-text">{{ 'sitnet_edit_all_rooms' | translate }}</span>
            </div>
        </div>
        <div id="dashboard">
            <div class="main-row">
                <div class="detail-row-tall" *ngFor="let room of rooms">
                    <div class="col-md-12">
                        <b>{{ room.name }}</b>
                    </div>
                </div>
            </div>
            <div class="main-row">
                <div class="col-md-12">
                    <button (click)="addMultiRoomException()" class="btn btn-primary">
                        {{ 'sitnet_add' | translate }}
                    </button>
                </div>
            </div>
        </div> `,
})
export class ExceptionListAllComponent implements OnInit {
    week: Week;
    rooms: ExamRoom[] = [];
    roomIds: number[] = [];

    constructor(private toast: ToastrService, private room: RoomService) {
        this.week = this.room.getWeek();
    }

    ngOnInit() {
        this.loadRooms();
    }

    addException = (exception: ExceptionWorkingHours) => {
        this.room.addException(this.getRoomIds(), exception).then(() => {
            this.loadRooms();
        });
    };

    deleteException = (exception: ExceptionWorkingHours) => {
        this.room.deleteException(this.rooms[0].id, exception.id).then(() => {
            this.loadRooms();
        });
    };

    addMultiRoomException = () => {
        this.room.openExceptionDialog(this.addException);
    };

    updateWorkingHours = () => {
        this.room.updateWorkingHours$(this.week, this.getRoomIds()).subscribe();
    };

    massEditedRoomFilter = (room: ExamRoom) => room.calendarExceptionEvents.some((e) => e.massEdited);

    massEditedExceptionFilter = (exception: ExceptionWorkingHours) => exception.massEdited;

    private loadRooms = () => {
        this.room.getRooms$().subscribe({
            next: (rooms) => {
                this.rooms = orderBy(rooms, 'name', 'asc').filter(this.massEditedRoomFilter);
                this.roomIds = this.getRoomIds();
            },
            error: this.toast.error,
        });
    };

    private getRoomIds = () => this.rooms.map((room) => room.id);
}
