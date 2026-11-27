// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExceptionWorkingHours } from 'src/app/reservation/reservation.model';

@Component({
    template: `
        <div class="modal-header">
            <div class="xm-modal-title">{{ 'i18n_remove_exception_confirmation' | translate }}</div>
        </div>
        <div class="modal-body">
            <div class="xm-cluster">
                <div>
                    {{ message() }}
                </div>
                @if (exception()?.outOfService) {
                    <div class="xm-text-danger">
                        {{ 'i18n_room_out_of_service' | translate }}
                    </div>
                }
                @if (!exception()?.outOfService) {
                    <div class="xm-text-info">
                        {{ 'i18n_room_in_service' | translate }}
                    </div>
                }
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline-secondary" (click)="activeModal.dismiss()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
            <button class="btn btn-success" (click)="activeModal.close()" autofocus>
                {{ 'i18n_confirm' | translate }}
            </button>
        </div>
    `,
    styleUrls: ['../rooms/rooms.component.scss'],
    imports: [TranslateModule],
})
export class ExceptionDeleteDialogComponent {
    readonly message = signal<string | undefined>(undefined);
    readonly exception = signal<ExceptionWorkingHours | undefined>(undefined);

    protected readonly activeModal = inject(NgbActiveModal);
}
