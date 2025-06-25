// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-confirmation-dialog',
    standalone: true,
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <div class="xm-modal-title">{{ title | translate }}</div>
        </div>
        <div class="modal-body" [innerHTML]="description"></div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-success" (click)="activeModal.close(true)" autofocus>
                {{ getConfirmButtonText() | translate }}
            </button>
            <button class="btn btn-secondary me-3" (click)="activeModal.dismiss(false)">
                {{ getCancelButtonText() | translate }}
            </button>
        </div>
    `,
})
export class ConfirmationDialogComponent {
    title = '';
    description = '';
    confirmButtonText?: string;
    cancelButtonText?: string;

    constructor(public activeModal: NgbActiveModal) {}

    getConfirmButtonText(): string {
        return this.confirmButtonText || 'i18n_button_accept';
    }

    getCancelButtonText(): string {
        return this.cancelButtonText || 'i18n_button_decline';
    }
}
