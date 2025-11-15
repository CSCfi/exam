// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, model, signal } from '@angular/core';
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
            <textarea
                class="form-control"
                [ngModel]="message().text"
                (ngModelChange)="setMessageText($event)"
                rows="3"
                autofocus
            >
            </textarea>
        </div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-sm btn-success" (click)="ok()">{{ 'i18n_send' | translate }}</button>
            <button class="btn btn-sm btn-outline-secondary me-3" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemoveReservationDialogComponent {
    reservation = model<Reservation | undefined>(undefined);
    message = signal<{ text: string }>({ text: '' });

    activeModal = inject(NgbActiveModal);
    private http = inject(HttpClient);
    private toast = inject(ToastrService);

    ok() {
        const currentReservation = this.reservation();
        if (!currentReservation) return;
        this.http
            .delete(`/app/reservations/${currentReservation.id}`, {
                headers: { 'Content-Type': 'application/json' },
                params: { msg: this.message().text },
            })
            .subscribe({
                next: () => this.activeModal.close(),
                error: (err) => this.toast.error(err),
            });
    }

    cancel() {
        this.activeModal.dismiss();
    }

    setMessageText(text: string) {
        this.message.update((m) => ({ ...m, text }));
    }
}
