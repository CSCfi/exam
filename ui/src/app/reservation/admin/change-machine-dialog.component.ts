// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, Input, ViewChild, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { map } from 'rxjs';
import type { ExamMachine, ExamRoom, Reservation } from 'src/app/reservation/reservation.model';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';

// A machine can be offered at more than one time: an ongoing reservation can either keep its
// original time or move to the next free slot. Each of those is a choice of its own in the list.
interface MachineSlot {
    start: string;
    end: string;
    startAt: string;
    endAt: string;
}
interface AvailableMachine {
    machine: ExamMachine;
    slots: MachineSlot[];
}
interface MachineChoice {
    machine: ExamMachine;
    slot: MachineSlot;
}

@Component({
    selector: 'xm-change-machine-dialog',
    imports: [TranslateModule, DropdownSelectComponent],
    template: `
        <div class="modal-header">
            <h4 class="xm-modal-title">
                <i class="bi-info-circle"></i>&nbsp;&nbsp;{{ 'i18n_change_reservation_machine' | translate }}
            </h4>
        </div>
        <div class="modal-body">
            <form>
                <div class="form-group">
                    <label for="room">{{ 'i18n_examination_location' | translate }}</label>
                    <xm-dropdown-select
                        id="room"
                        [initial]="room"
                        [options]="availableRoomOptions"
                        [limitTo]="0"
                        [allowClearing]="false"
                        (optionSelected)="roomChanged($event)"
                        placeholder="{{ 'i18n_select' | translate }}"
                    ></xm-dropdown-select>
                </div>
                <div class="form-group mt-2">
                    <label for="room">{{ 'i18n_exam_machine' | translate }}</label>
                    <xm-dropdown-select
                        #machineSelection
                        [options]="availableMachineOptions"
                        [limitTo]="0"
                        [allowClearing]="false"
                        (optionSelected)="machineChanged($event)"
                        placeholder="{{ 'i18n_select' | translate }}"
                        autofocus
                    ></xm-dropdown-select>
                </div>
            </form>
            <div class="d-flex flex-row-reverse flex-align-r m-3">
                <button class="btn btn-sm btn-success" (click)="ok()" [disabled]="!choice">
                    {{ 'i18n_button_save' | translate }}
                </button>
                <button class="btn btn-sm btn-outline-secondary me-3" (click)="cancel()">
                    {{ 'i18n_button_cancel' | translate }}
                </button>
            </div>
        </div>
    `,
})
export class ChangeMachineDialogComponent implements OnInit {
    @Input() reservation!: Reservation;
    @ViewChild('machineSelection') machineSelection!: DropdownSelectComponent<MachineChoice, string>;

    activeModal = inject(NgbActiveModal);

    room!: Option<ExamRoom, number>;
    availableRoomOptions: Option<ExamRoom, number>[] = [];
    choice?: MachineChoice;
    availableMachineOptions: Option<MachineChoice, string>[] = [];

    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);

    ngOnInit() {
        const room = this.reservation.machine.room;
        this.room = { id: room.id, label: room.name, value: room };
        this.http
            .get<ExamRoom[]>('/app/rooms')
            .pipe(map((rs) => rs.filter((r) => !r.outOfService)))
            .subscribe(
                (resp) =>
                    (this.availableRoomOptions = resp.map((o) => ({
                        id: o.id,
                        label: o.name,
                        value: o,
                    }))),
            );
        this.setAvailableMachines();
    }

    machineChanged = (event?: Option<MachineChoice, string>) => {
        this.choice = event?.value;
    };
    roomChanged = (event?: Option<ExamRoom, number>) => {
        const room = event?.value as ExamRoom;
        this.room = { id: room.id, label: room.name, value: room };
        delete this.choice;
        this.machineSelection.clearSelection();
        this.setAvailableMachines();
    };

    ok = () =>
        this.http
            .put<Reservation>(`/app/reservations/${this.reservation.id}/machine`, {
                machineId: this.choice?.machine.id,
                start: this.choice?.slot.start,
                end: this.choice?.slot.end,
            })
            .subscribe({
                next: (resp) => {
                    this.toast.info(this.translate.instant('i18n_updated'));
                    this.activeModal.close(resp);
                },
                error: (err) => this.toast.error(err),
            });

    cancel = () => this.activeModal.dismiss();

    private setAvailableMachines = () =>
        this.http
            .get<AvailableMachine[]>(`/app/reservations/${this.reservation.id}/${this.room.id}/machines`)
            .subscribe(
                (resp) =>
                    (this.availableMachineOptions = resp.flatMap((o) =>
                        o.slots.map((slot) => ({
                            id: `${o.machine.id}-${slot.start}`,
                            label: `${o.machine.name} (${slot.startAt} - ${slot.endAt})`,
                            value: { machine: o.machine, slot },
                        })),
                    )),
            );
}
