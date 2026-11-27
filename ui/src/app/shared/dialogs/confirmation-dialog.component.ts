// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-success" (click)="activeModal.close(true)" autofocus>
                {{ confirmButtonText() | translate }}
            </button>
            <button class="btn btn-secondary me-3" (click)="activeModal.dismiss(false)">
                {{ cancelButtonText() | translate }}
            </button>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
    readonly title = signal('');
    readonly description = signal('');
    readonly confirmButtonText = signal('i18n_button_accept');
    readonly cancelButtonText = signal('i18n_button_decline');

    protected readonly activeModal = inject(NgbActiveModal);
}
