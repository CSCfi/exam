// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExceptionListComponent } from 'src/app/facility/schedule/exceptions.component';
import type { ExamRoom, ExceptionWorkingHours } from 'src/app/reservation/reservation.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { RoomService } from './room.service';

type SelectableRoom = ExamRoom & { selected: boolean; showBreaks: boolean };

@Component({
    selector: 'xm-room-mass-edit',
    template: `
        <xm-page-header text="i18n_edit_all_rooms" />
        <xm-page-content [content]="content" />
        <ng-template #content>
            <div class="row">
                <div class="col-md-12">
                    <button (click)="addMultiRoomException(true)" class="btn btn-sm btn-outline-dark me-2 mb-2">
                        {{ 'i18n_add_out_of_service_time' | translate }}
                    </button>
                    <button (click)="addMultiRoomException(false)" class="btn btn-sm btn-outline-success mb-2">
                        {{ 'i18n_add_extra_working_hour' | translate }}
                    </button>
                </div>
            </div>
            <div class="row my-2">
                <div class="col-md-12">
                    <div class="form-check">
                        <input
                            type="checkbox"
                            class="form-check-input"
                            name="select_all"
                            [ngModel]="allSelected()"
                            (ngModelChange)="setAllSelected($event)"
                            (change)="selectAll()"
                            triggers="mouseenter:mouseleave"
                            ngbPopover="{{ 'i18n_check_uncheck_all' | translate }}"
                            popoverTitle="{{ 'i18n_instructions' | translate }}"
                        />
                        <label class="form-check-label ms-1" for="flexCheckIndeterminate">
                            <strong>{{ 'i18n_select_all_rooms' | translate }}</strong>
                        </label>
                    </div>
                </div>
            </div>
            @for (room of rooms(); track room.id) {
                <div class="row mt-2">
                    <div class="col-md-12">
                        <div class="form-check">
                            <input
                                type="checkbox"
                                class="form-check-input"
                                name="select_room"
                                [ngModel]="room.selected"
                                (ngModelChange)="updateRoomSelected(room, $event)"
                            />
                            <label class="form-check-label" for="room"
                                ><strong>{{ room.name || 'i18n_no_name' | translate }}</strong></label
                            >
                            @if (room.calendarExceptionEvents.length > 0) {
                                <i
                                    class="user-select-none ms-1"
                                    [ngClass]="room.showBreaks ? 'bi-chevron-down' : 'bi-chevron-right'"
                                    (click)="toggleRoomShowBreaks(room)"
                                ></i>
                            }
                        </div>
                    </div>
                    <div class="row ms-3">
                        @if (room.showBreaks) {
                            <div class="col-md-12">
                                <xm-exceptions
                                    [exceptions]="room.calendarExceptionEvents"
                                    (removed)="deleteException($event, room)"
                                    [hideButton]="true"
                                    [hideTitle]="true"
                                ></xm-exceptions>
                            </div>
                        }
                    </div>
                </div>
            }

            <div class="row mt-2">
                <div class="col-12">
                    <button (click)="addMultiRoomException(true)" class="btn btn-sm btn-outline-dark me-2 mb-2">
                        {{ 'i18n_add_out_of_service_time' | translate }}
                    </button>
                    <button (click)="addMultiRoomException(false)" class="btn btn-sm btn-outline-success mb-2">
                        {{ 'i18n_add_extra_working_hour' | translate }}
                    </button>
                </div>
            </div>
        </ng-template>
    `,
    imports: [
        FormsModule,
        NgbPopover,
        NgClass,
        ExceptionListComponent,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
    styleUrl: './rooms.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiRoomComponent {
    rooms = signal<SelectableRoom[]>([]);
    roomIds = signal<number[]>([]);
    allSelected = signal(false);

    private toast = inject(ToastrService);
    private roomService = inject(RoomService);
    private translate = inject(TranslateService);

    constructor() {
        this.loadRooms();
    }

    addExceptions(exceptions: ExceptionWorkingHours[]) {
        this.roomService
            .addExceptions$(
                this.rooms()
                    .filter((r) => r.selected)
                    .map((r) => r.id),
                exceptions,
            )
            .subscribe(() => this.loadRooms());
    }

    deleteException(exception: ExceptionWorkingHours, room: ExamRoom) {
        this.roomService.deleteException$(room.id, exception.id).subscribe(() => this.loadRooms());
    }

    addMultiRoomException(outOfService: boolean) {
        const currentRooms = this.rooms();
        const allExceptions = currentRooms
            .filter((r) => r.selected)
            .flatMap((room) =>
                room.calendarExceptionEvents.map((e) => {
                    e.ownerRoom = room.name;
                    return e;
                }),
            );
        if (!currentRooms.some((r) => r.selected)) {
            this.toast.error(this.translate.instant('i18n_select_room_error'));
            return;
        }
        if (outOfService) this.roomService.openExceptionDialog(this.addExceptions.bind(this), true, allExceptions);
        else this.roomService.openExceptionDialog(this.addExceptions.bind(this), false, allExceptions);
    }

    selectAll() {
        const selected = this.allSelected();
        this.rooms.update((rooms) => rooms.map((r) => ({ ...r, selected })));
    }

    setAllSelected(value: boolean) {
        this.allSelected.set(value);
    }

    updateRoomSelected(room: SelectableRoom, selected: boolean) {
        this.rooms.update((rooms) => rooms.map((r) => (r.id === room.id ? { ...r, selected } : r)));
    }

    toggleRoomShowBreaks(room: SelectableRoom) {
        this.rooms.update((rooms) => rooms.map((r) => (r.id === room.id ? { ...r, showBreaks: !r.showBreaks } : r)));
    }

    private loadRooms() {
        this.roomService.getRooms$().subscribe({
            next: (rooms) => {
                const processedRooms = rooms
                    .map((r) => ({
                        ...r,
                        selected: false,
                        showBreaks: false,
                        calendarExceptionEvents: r.calendarExceptionEvents.filter(
                            (e) => new Date(e.endDate) > new Date(),
                        ),
                    }))
                    .sort((a, b) => (a.name < b.name ? -1 : 1));
                this.rooms.set(processedRooms);
            },
            error: (err) => this.toast.error(err),
        });
    }
}
