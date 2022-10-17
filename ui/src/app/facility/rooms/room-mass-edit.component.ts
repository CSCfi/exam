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

import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Output } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';
import type { Week } from './room.service';
import { RoomService } from './room.service';

type SelectableRoom = ExamRoom & { selected: boolean };

@Component({
    selector: 'xm-room-mass-edit',
    template: `
        <div id="sitnet-header" class="header">
            <div class="header-wrapper">
                <span class="header-text">{{ 'sitnet_edit_all_rooms' | translate }}</span>
            </div>
        </div>
        <div id="dashboard">
            <div class="row ms-4 mt-4">
                <div class="col-md-12">
                    <div class="row">
                        <h3 class="col-auto header-text">{{ 'sitnet_exception_datetimes' | translate }}</h3>
                        <div class="col">
                            <button (click)="addMultiRoomException()" class="btn btn-primary">
                                {{ 'sitnet_add' | translate }}
                            </button>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <div class="form-check">
                                <input
                                    type="checkbox"
                                    class="form-check-input"
                                    id="flexCheckIndeterminate"
                                    name="select_all"
                                    [(ngModel)]="allSelected"
                                    (change)="selectAll()"
                                    triggers="mouseenter:mouseleave"
                                    ngbPopover="{{ 'sitnet_check_uncheck_all' | translate }}"
                                    popoverTitle="{{ 'sitnet_instructions' | translate }}"
                                />
                                <label class="form-check-label marl5" for="flexCheckIndeterminate">
                                    <strong>{{ 'sitnet_select_all_rooms' | translate }}</strong>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div *ngFor="let room of selectableRooms">
                        <div class="row mt-2">
                            <div class="col-md-12">
                                <div class="form-check">
                                    <input
                                        type="checkbox"
                                        class="form-check-input"
                                        name="select_room"
                                        id="room"
                                        [(ngModel)]="room.selected"
                                    />
                                    <label class="form-check-label" for="room"
                                        ><strong>{{ room.name || 'sitnet_no_name' | translate }}</strong></label
                                    >
                                </div>
                            </div>
                        </div>
                        <div class="row ms-3">
                            <div class="col-md-12">
                                <xm-exceptions
                                    [exceptions]="room.calendarExceptionEvents"
                                    (removed)="deleteException($event)"
                                    [hideButton]="true"
                                    [hideTitle]="true"
                                ></xm-exceptions>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row ms-4 mt-4">
                <div class="col-md-12">
                    <button (click)="addMultiRoomException()" class="btn btn-primary">
                        {{ 'sitnet_add' | translate }}
                    </button>
                </div>
            </div>
        </div>
    `,
})
export class MultiRoomComponent implements OnInit, OnChanges {
    @Output() selected = new EventEmitter<number[]>();

    week: Week = {};
    allRooms: ExamRoom[] = [];
    selectableRooms: SelectableRoom[] = [];
    roomIds: number[] = [];
    allSelected = false;

    constructor(private toast: ToastrService, private roomService: RoomService) {}

    ngOnInit() {
        this.loadRooms();
        this.week = this.roomService.getWeek();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.questions) {
            this.resetSelections();
            this.selectableRooms = this.allRooms as SelectableRoom[];
        }
    }

    addExceptions = (exceptions: ExceptionWorkingHours[]) =>
        this.roomService.addExceptions(this.getRoomIds(), exceptions).then(() => {
            this.loadRooms();
        });

    deleteException = (exception: ExceptionWorkingHours) => {
        this.roomService.deleteException(this.allRooms[0].id, exception.id).then(() => {
            this.loadRooms();
        });
    };

    addMultiRoomException = () => {
        this.roomService.openExceptionDialog(this.addExceptions);
    };

    updateWorkingHours = () => {
        this.roomService.updateWorkingHours$(this.week, this.getRoomIds()).subscribe();
    };

    selectAll = () => {
        this.selectableRooms.forEach((r) => (r.selected = this.allSelected));
    };

    private loadRooms = () => {
        this.roomService.getRooms$().subscribe({
            next: (rooms) => {
                this.allRooms = rooms;
                this.selectableRooms = rooms.sort((a, b) => (a.name < b.name ? -1 : 1)) as SelectableRoom[];
                this.roomIds = this.getRoomIds();
            },
            error: this.toast.error,
        });
    };

    private resetSelections = () => {
        this.selectableRooms.forEach((q) => (q.selected = false));
    };

    private getRoomIds = (): number[] => {
        return this.selectableRooms.filter((r) => r.selected).map((room) => room.id);
    };
}
