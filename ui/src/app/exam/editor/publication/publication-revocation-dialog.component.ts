// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-publication-revoke-dialog',
    standalone: true,
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <div class="xm-modal-title">{{ 'i18n_unpublish_exam_confirm_dialog_title' | translate }}</div>
        </div>
        <div class="modal-body">
            <p>
                {{ 'i18n_unpublish_exam_confirm' | translate }}
            </p>
        </div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-success" (click)="activeModal.close()" autofocus>
                {{ 'i18n_unpublish_exam' | translate }}
            </button>
            <button class="btn btn-outline-secondary me-3" (click)="activeModal.dismiss()">
                {{ 'i18n_close' | translate }}
            </button>
        </div>
    `,
})
export class PublicationRevocationDialogComponent {
    constructor(public activeModal: NgbActiveModal) {}
}
