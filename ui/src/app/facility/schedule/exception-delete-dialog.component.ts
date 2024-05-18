// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExceptionWorkingHours } from 'src/app/reservation/reservation.model';

@Component({
    template: `
        <div class="modal-header">
            <div class="xm-modal-title">{{ 'i18n_remove_exception_confirmation' | translate }}</div>
        </div>
        <div class="modal-body">
            <div class="d-flex">
                <div class="me-2">
                    {{ message }}
                </div>
                @if (exception?.outOfService) {
                    <div class="text-danger">
                        {{ 'i18n_room_out_of_service' | translate }}
                    </div>
                }
                @if (!exception?.outOfService) {
                    <div class="text-info">
                        {{ 'i18n_room_in_service' | translate }}
                    </div>
                }
            </div>
        </div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-success" (click)="activeModal.close()" autofocus>
                {{ 'i18n_confirm' | translate }}
            </button>
            <button class="btn btn-outline-secondary me-3" (click)="activeModal.dismiss()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
    styleUrls: ['../rooms/rooms.component.scss'],
    standalone: true,
    imports: [TranslateModule],
})
export class ExceptionDeleteDialogComponent {
    @Input() message?: string;
    @Input() exception?: ExceptionWorkingHours;

    constructor(public activeModal: NgbActiveModal) {}
}
