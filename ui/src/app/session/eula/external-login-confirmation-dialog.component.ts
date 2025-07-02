// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { User } from 'src/app/session/session.model';

@Component({
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <h1 class="xm-modal-title">{{ 'i18n_status_notice' | translate }}</h1>
        </div>
        <div class="modal-body">
            {{ 'i18n_external_organisation_login' | translate }} <strong>{{ user.externalUserOrg }}</strong>
            {{ 'i18n_external_organisation_login_description' | translate }}
        </div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-success" (click)="activeModal.close()" autofocus>
                {{ 'i18n_button_accept' | translate }}
            </button>
            <button class="btn btn-outline-secondary me-3" (click)="activeModal.dismiss()">
                {{ 'i18n_button_decline' | translate }}
            </button>
        </div>
    `,
})
export class ExternalLoginConfirmationDialogComponent {
    @Input() user!: User;

    constructor(public activeModal: NgbActiveModal) {}
}
