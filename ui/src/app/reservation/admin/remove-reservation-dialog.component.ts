// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Reservation } from 'src/app/reservation/reservation.model';

@Component({
    selector: 'xm-remove-reservation-dialog',
    imports: [FormsModule, TranslateModule],
    template: `
        <div class="modal-header">
            <h4 class="xm-modal-title">
                <i class="bi-trash"></i>&nbsp;&nbsp;{{ 'i18n_remove_reservation' | translate }}
            </h4>
        </div>
        <div class="modal-body">
            <strong>{{ 'i18n_message' | translate }}</strong>
            <textarea class="form-control" [(ngModel)]="message.text" rows="3" autofocus> </textarea>
        </div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-sm btn-success" (click)="ok()">{{ 'i18n_send' | translate }}</button>
            <button class="btn btn-sm btn-outline-secondary me-3" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
})
export class RemoveReservationDialogComponent {
    @Input() reservation!: Reservation;
    message = { text: '' };

    constructor(
        public activeModal: NgbActiveModal,
        private http: HttpClient,
        private toast: ToastrService,
    ) {}

    ok = () =>
        this.http
            .delete(`/app/reservations/${this.reservation.id}`, {
                headers: { 'Content-Type': 'application/json' },
                params: { msg: this.message.text },
            })
            .subscribe({
                next: this.activeModal.close,
                error: (err) => this.toast.error(err),
            });

    cancel = () => this.activeModal.dismiss();
}
