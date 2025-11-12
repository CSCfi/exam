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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
    activeModal = inject(NgbActiveModal);

    private _title = signal('');
    private _description = signal('');
    private _confirmButtonText = signal<string | undefined>(undefined);
    private _cancelButtonText = signal<string | undefined>(undefined);

    // Getters/setters for compatibility with direct property assignment pattern
    get title(): string {
        return this._title();
    }

    get description(): string {
        return this._description();
    }

    get confirmButtonText(): string | undefined {
        return this._confirmButtonText();
    }

    get cancelButtonText(): string | undefined {
        return this._cancelButtonText();
    }

    set title(value: string) {
        this._title.set(value);
    }

    set description(value: string) {
        this._description.set(value);
    }

    set confirmButtonText(value: string | undefined) {
        this._confirmButtonText.set(value);
    }

    set cancelButtonText(value: string | undefined) {
        this._cancelButtonText.set(value);
    }

    getConfirmButtonText(): string {
        return this.confirmButtonText || 'i18n_button_accept';
    }

    getCancelButtonText(): string {
        return this.cancelButtonText || 'i18n_button_decline';
    }
}
