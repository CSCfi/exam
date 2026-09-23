// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewChild, inject, model, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { filter, map, switchMap } from 'rxjs';
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
            <div class="form-group">
                <label for="room">{{ 'i18n_examination_location' | translate }}</label>
                <xm-dropdown-select
                    #roomSelection
                    id="room"
                    [initial]="room()"
                    [options]="availableRoomOptions()"
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
                    [options]="availableMachineOptions()"
                    [limitTo]="0"
                    [allowClearing]="false"
                    (optionSelected)="machineChanged($event)"
                    placeholder="{{ 'i18n_select' | translate }}"
                    autofocus
                ></xm-dropdown-select>
            </div>

            <div class="d-flex flex-row-reverse flex-align-r m-3">
                <button class="btn btn-success" (click)="ok()" [disabled]="!choice()">
                    {{ 'i18n_button_save' | translate }}
                </button>
                <button class="btn btn-outline-secondary me-3" (click)="cancel()">
                    {{ 'i18n_button_cancel' | translate }}
                </button>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangeMachineDialogComponent {
    @ViewChild('machineSelection') machineSelection!: DropdownSelectComponent<MachineChoice, string>;
    @ViewChild('roomSelection') roomSelection!: DropdownSelectComponent<ExamRoom, number>;

    readonly reservation = model<Reservation | undefined>(undefined);
    readonly room = signal<Option<ExamRoom, number> | undefined>(undefined);
    readonly availableRoomOptions = signal<Option<ExamRoom, number>[]>([]);
    readonly choice = signal<MachineChoice | undefined>(undefined);
    readonly availableMachineOptions = signal<Option<MachineChoice, string>[]>([]);

    private readonly activeModal = inject(NgbActiveModal);
    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);

    constructor() {
        toObservable(this.reservation)
            .pipe(
                filter(Boolean),
                switchMap((reservation) => {
                    const room = reservation.machine.room;
                    this.room.set({ id: room.id, label: room.name, value: room });
                    return this.http.get<ExamRoom[]>('/app/rooms').pipe(map((rs) => rs.filter((r) => !r.outOfService)));
                }),
                takeUntilDestroyed(),
            )
            .subscribe((resp) => {
                this.availableRoomOptions.set(resp.map((o) => ({ id: o.id, label: o.name, value: o })));
                this.setAvailableMachines();
            });
    }

    machineChanged(event?: Option<MachineChoice, string>) {
        this.choice.set(event?.value);
    }

    roomChanged(event?: Option<ExamRoom, number>) {
        if (!event) return;
        // Use the option from the event directly (it's already from the options array)
        // This ensures the dropdown displays it correctly since it's the same object reference
        this.room.set(event);
        this.choice.set(undefined);
        this.machineSelection.clearSelection();
        this.setAvailableMachines();
    }

    ok() {
        const currentReservation = this.reservation();
        const currentChoice = this.choice();
        if (!currentReservation || !currentChoice) return;
        this.http
            .put<Reservation>(`/app/reservations/${currentReservation.id}/machine`, {
                machineId: currentChoice.machine.id,
                start: currentChoice.slot.start,
                end: currentChoice.slot.end,
            })
            .subscribe({
                next: (resp) => {
                    this.toast.info(this.translate.instant('i18n_updated'));
                    this.activeModal.close(resp);
                },
                error: (err) => this.toast.error(err),
            });
    }

    cancel() {
        this.activeModal.dismiss();
    }

    private setAvailableMachines() {
        const currentReservation = this.reservation();
        const currentRoom = this.room();
        if (!currentReservation || !currentRoom) return;

        this.http
            .get<AvailableMachine[]>(`/app/reservations/${currentReservation.id}/${currentRoom.id}/machines`)
            .subscribe((resp) =>
                this.availableMachineOptions.set(
                    resp.flatMap((o) =>
                        o.slots.map((slot) => ({
                            id: `${o.machine.id}-${slot.start}`,
                            label: `${o.machine.name} (${slot.startAt} - ${slot.endAt})`,
                            value: { machine: o.machine, slot },
                        })),
                    ),
                ),
            );
    }
}
