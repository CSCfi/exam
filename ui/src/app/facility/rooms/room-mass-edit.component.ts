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

import { NgClass } from '@angular/common';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamRoom, ExceptionWorkingHours } from '../../reservation/reservation.model';
import { ExceptionListComponent } from '../schedule/exceptions.component';
import { RoomService } from './room.service';

type SelectableRoom = ExamRoom & { selected: boolean; showBreaks: boolean };

@Component({
    selector: 'xm-room-mass-edit',
    template: `
        <div id="sitnet-header" class="header">
            <div class="header-wrapper">
                <span class="header-text">{{ 'i18n_edit_all_rooms' | translate }}</span>
            </div>
        </div>
        <div id="dashboard">
            <div class="row ms-4 mt-4">
                <div class="col-md-12">
                    <div class="row">
                        <h3 class="col-auto header-text">{{ 'i18n_exception_datetimes' | translate }}</h3>
                        <div class="col-12">
                            <button
                                (click)="addMultiRoomException(true)"
                                class="btn btn-sm btn-outline-dark marr20 marb10"
                            >
                                {{ 'i18n_add_out_of_service_time' | translate }}
                            </button>
                            <button
                                (click)="addMultiRoomException(false)"
                                class="btn btn-sm btn-outline-success marb10"
                            >
                                {{ 'i18n_add_extra_working_hour' | translate }}
                            </button>
                        </div>
                    </div>
                    <div class="row mt-2 marb20">
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
                                    ngbPopover="{{ 'i18n_check_uncheck_all' | translate }}"
                                    popoverTitle="{{ 'i18n_instructions' | translate }}"
                                />
                                <label class="form-check-label marl5" for="flexCheckIndeterminate">
                                    <strong>{{ 'i18n_select_all_rooms' | translate }}</strong>
                                </label>
                            </div>
                            <div>
                                <label class="form-check-label marl5 " for="flexCheckIndeterminate">
                                    <strong>{{ 'i18n_show_all' | translate }}</strong>
                                </label>
                                <i
                                    class="user-select-none marl5"
                                    [ngClass]="showBreaks ? 'bi-chevron-down' : 'bi-chevron-right'"
                                    (click)="switchShowAll()"
                                ></i>
                            </div>
                        </div>
                    </div>
                    @for (room of selectableRooms; track room) {
                        <div>
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
                                            ><strong>{{ room.name || 'i18n_no_name' | translate }}</strong></label
                                        >
                                        <i
                                            class="user-select-none marl5"
                                            [ngClass]="room.showBreaks ? 'bi-chevron-down' : 'bi-chevron-right'"
                                            (click)="room.showBreaks = !room.showBreaks"
                                        ></i>
                                    </div>
                                </div>
                            </div>
                            <div class="row ms-3">
                                @if (room.showBreaks) {
                                    <div class="col-md-12">
                                        <xm-exceptions
                                            [exceptions]="room.calendarExceptionEvents"
                                            (removed)="deleteException($event)"
                                            [hideButton]="true"
                                            [hideTitle]="true"
                                        ></xm-exceptions>
                                    </div>
                                }
                            </div>
                        </div>
                    }
                </div>
            </div>
            <div class="col-12">
                <button (click)="addMultiRoomException(true)" class="btn btn-sm btn-outline-dark marr20 marb10">
                    {{ 'i18n_add_out_of_service_time' | translate }}
                </button>
                <button (click)="addMultiRoomException(false)" class="btn btn-sm btn-outline-success marb10">
                    {{ 'i18n_add_extra_working_hour' | translate }}
                </button>
            </div>
        </div>
    `,
    standalone: true,
    imports: [FormsModule, NgbPopover, NgClass, ExceptionListComponent, TranslateModule],
})
export class MultiRoomComponent implements OnInit, OnChanges {
    @Output() selected = new EventEmitter<number[]>();

    allRooms: ExamRoom[] = [];
    selectableRooms: SelectableRoom[] = [];
    roomIds: number[] = [];
    allSelected = false;
    showBreaks = false;

    constructor(
        private toast: ToastrService,
        private roomService: RoomService,
        private translate: TranslateService,
    ) {}

    ngOnInit() {
        this.loadRooms();
        this.selectableRooms = this.allRooms as SelectableRoom[];
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.questions) {
            this.resetSelections();
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

    addMultiRoomException = (outOfService: boolean) => {
        const allExceptions: ExceptionWorkingHours[] = [];
        this.selectableRooms.forEach((room) => {
            if (room.selected) {
                allExceptions.push(
                    ...room.calendarExceptionEvents.map((e) => {
                        e.ownerRoom = room.name;
                        return e;
                    }),
                );
            }
        });
        if (allExceptions.length === 0) {
            this.toast.error(this.translate.instant('i18n_select_room_error'));
            return;
        }
        outOfService
            ? this.roomService.openExceptionDialog(this.addExceptions, true, allExceptions)
            : this.roomService.openExceptionDialog(this.addExceptions, false, allExceptions);
    };

    selectAll = () => {
        this.selectableRooms.forEach((r) => (r.selected = this.allSelected));
    };

    switchShowAll = () => {
        this.showBreaks = !this.showBreaks;
        this.showAll();
    };

    showAll = () => this.selectableRooms.forEach((r) => (r.showBreaks = this.showBreaks));

    private loadRooms = () => {
        this.roomService.getRooms$().subscribe({
            next: (rooms) => {
                this.allRooms = rooms;
                this.selectableRooms = rooms.sort((a, b) => (a.name < b.name ? -1 : 1)) as SelectableRoom[];
                this.showAll();
                this.selectableRooms.forEach((r) => (r.selected = this.allSelected));
                this.roomIds = this.getRoomIds();
            },
            error: (err) => this.toast.error(err),
        });
    };

    private resetSelections = () => {
        this.selectableRooms.forEach((q) => (q.selected = false));
    };

    private getRoomIds = (): number[] => {
        return this.selectableRooms.filter((r) => r.selected).map((room) => room.id);
    };
}
