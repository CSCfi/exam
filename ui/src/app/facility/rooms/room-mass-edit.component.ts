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
import { ToastrService } from 'ngx-toastr';
import type { ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';
import type { Week } from './room.service';
import { RoomService } from './room.service';

@Component({
    selector: 'xm-multi-room',
    template: `<div id="sitnet-header" class="header">
            <div class="header-wrapper">
                <span class="header-text">{{ 'sitnet_edit_all_rooms' | translate }}</span>
            </div>
        </div>
        <div id="dashboard">
            <div class="main-row d-block">
                <div class="top-row">
                    <h3 class="header-text">{{ 'sitnet_room_default_working_hours' | translate }}</h3>
                </div>
                <div class="bottom-row">
                    <xm-opening-hours
                        *ngIf="allRooms"
                        class="col-md-12"
                        [week]="week"
                        (onSelect)="updateWorkingHours()"
                    ></xm-opening-hours>
                </div>
                <xm-starting-time *ngIf="allRooms" [roomIds]="roomIds"></xm-starting-time>
                <div class="top-row">
                    <h3 class="col-md-12 header-text">{{ 'sitnet_exception_datetimes' | translate }}</h3>
                </div>
                <div class="detail-row-tall" *ngFor="let room of massEditedRooms">
                    <div class="col-md-12">
                        <b>{{ room.name || 'sitnet_no_name' | translate }}</b>
                    </div>
                    <xm-exceptions
                        [exceptions]="room.calendarExceptionEvents"
                        (created)="addException($event)"
                        (removed)="deleteException($event)"
                        [filter]="massEditedExceptionFilter"
                        [hideButton]="true"
                        [hideTitle]="true"
                    ></xm-exceptions>
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
export class MultiRoomComponent implements OnInit {
    week: Week = {};
    allRooms: ExamRoom[] = [];
    massEditedRooms: ExamRoom[] = [];
    roomIds: number[] = [];

    constructor(private toast: ToastrService, private room: RoomService) {}

    ngOnInit() {
        this.loadRooms();
        this.week = this.room.getWeek();
    }

    addException = (exception: ExceptionWorkingHours) =>
        this.room.addException(this.getRoomIds(), exception).then(() => {
            this.loadRooms();
        });

    deleteException = (exception: ExceptionWorkingHours) => {
        this.room.deleteException(this.allRooms[0].id, exception.id).then(() => {
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
                this.allRooms = rooms;
                this.massEditedRooms = rooms
                    .sort((a, b) => (a.name < b.name ? -1 : 1))
                    .filter(this.massEditedRoomFilter);
                this.roomIds = this.getRoomIds();
            },
            error: this.toast.error,
        });
    };

    private getRoomIds = () => this.allRooms.map((room) => room.id);
}
