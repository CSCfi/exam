// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-publication-error-dialog',
    imports: [TranslateModule],
    template: `<div role="dialog" aria-modal="true">
        <div class="modal-header">
            <div class="xm-modal-title">{{ 'i18n_please_check_following_infos' | translate }}</div>
        </div>
        <div class="modal-body">
            @for (error of errors; track error) {
                <p>{{ error | translate }}</p>
            }
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" (click)="activeModal.close()" autofocus>
                {{ 'i18n_button_ok' | translate }}
            </button>
        </div>
    </div>`,
})
export class PublicationErrorDialogComponent {
    @Input() errors: string[] = [];

    constructor(public activeModal: NgbActiveModal) {}
}
