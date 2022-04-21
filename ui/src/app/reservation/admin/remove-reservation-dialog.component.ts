/*
 *  Copyright (c) 2018 Exam Consortium
 *
 *  Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 *  versions of the EUPL (the "Licence");
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 *  on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import type { Reservation } from '../reservation.model';

@Component({
    selector: 'xm-remove-reservation-dialog',
    template: `<div id="sitnet-dialog">
        <div class="terms-dialog-header">
            <h4><i class="bi-trash"></i>&nbsp;&nbsp;{{ 'sitnet_remove_reservation' | translate }}</h4>
        </div>
        <div class="modal-body">
            <strong>{{ 'sitnet_message' | translate }}</strong>
            <textarea class="form-control" [(ngModel)]="message.text" rows="3"> </textarea>
        </div>
        <div class="modal-footer">
            <button class="btn btn-sm btn-danger" (click)="cancel()">
                {{ 'sitnet_button_cancel' | translate }}
            </button>
            <button class="btn btn-sm btn-primary" (click)="ok()">{{ 'sitnet_send' | translate }}</button>
        </div>
    </div> `,
})
export class RemoveReservationDialogComponent {
    @Input() reservation!: Reservation;
    message = { text: '' };

    constructor(public activeModal: NgbActiveModal, private http: HttpClient, private toast: ToastrService) {}

    ok = () =>
        this.http
            .delete(`/app/reservations/${this.reservation.id}`, {
                headers: { 'Content-Type': 'application/json' },
                params: { msg: this.message.text },
            })
            .subscribe({
                next: this.activeModal.close,
                error: this.toast.error,
            });

    cancel = () => this.activeModal.dismiss();
}
