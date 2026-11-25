// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-confirmation-dialog',
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <div class="xm-modal-title">{{ title() | translate }}</div>
        </div>
        <div class="modal-body" [innerHTML]="description()"></div>
        <div class="xm-dialog-actions">
            <button class="btn btn-secondary" (click)="activeModal.dismiss(false)">
                {{ cancelButtonText() | translate }}
            </button>
            <button class="btn btn-success" (click)="activeModal.close(true)" autofocus>
                {{ confirmButtonText() | translate }}
            </button>
        </div>
    `,
})
export class ConfirmationDialogComponent {
    readonly title = signal('');
    readonly description = signal('');
    readonly confirmButtonText = signal('i18n_button_accept');
    readonly cancelButtonText = signal('i18n_button_decline');

    protected readonly activeModal = inject(NgbActiveModal);
}
