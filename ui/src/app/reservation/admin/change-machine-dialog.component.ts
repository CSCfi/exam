// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, Input, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { map } from 'rxjs';
import type { ExamMachine, ExamRoom, Reservation } from 'src/app/reservation/reservation.model';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';

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
                <button class="btn btn-sm btn-success" (click)="ok()" [disabled]="!machine?.id">
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
    @ViewChild('machineSelection') machineSelection!: DropdownSelectComponent<ExamMachine, number>;

    room!: Option<ExamRoom, number>;
    availableRoomOptions: Option<ExamRoom, number>[] = [];
    machine?: ExamMachine;
    availableMachineOptions: Option<ExamMachine, number>[] = [];

    constructor(
        public activeModal: NgbActiveModal,
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
    ) {}

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

    machineChanged = (event?: Option<ExamMachine, number>) => {
        this.machine = event?.value;
    };
    roomChanged = (event?: Option<ExamRoom, number>) => {
        const room = event?.value as ExamRoom;
        this.room = { id: room.id, label: room.name, value: room };
        delete this.machine;
        this.machineSelection.clearSelection();
        this.setAvailableMachines();
    };

    ok = () =>
        this.http
            .put<ExamMachine>(`/app/reservations/${this.reservation.id}/machine`, { machineId: this.machine?.id })
            .subscribe({
                next: (resp) => {
                    this.toast.info(this.translate.instant('i18n_updated'));
                    this.activeModal.close(resp);
                },
                error: (err) => this.toast.error(err),
            });

    cancel = () => this.activeModal.dismiss();

    private setAvailableMachines = () =>
        this.http.get<ExamMachine[]>(`/app/reservations/${this.reservation.id}/${this.room.id}/machines`).subscribe(
            (resp) =>
                (this.availableMachineOptions = resp.map((o) => ({
                    id: o.id,
                    label: o.name,
                    value: o,
                }))),
        );
}
