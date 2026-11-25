// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { User } from 'src/app/session/session.model';

@Component({
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <h1 class="xm-modal-title">
                {{ 'i18n_external_organisation_login' | translate }} ({{ user()!.homeOrganisations }})
            </h1>
        </div>
        <div class="modal-body">
            {{ 'i18n_external_organisation_login_description' | translate }}: {{ user()!.externalUserOrg }}?
        </div>
        <div class="xm-dialog-actions">
            <button class="btn btn-outline-secondary" (click)="activeModal.dismiss()">
                {{ 'i18n_button_decline' | translate }}
            </button>
            <button class="btn btn-success" (click)="activeModal.close()" autofocus>
                {{ 'i18n_button_accept' | translate }}
            </button>
        </div>
    `,
})
export class ExternalLoginConfirmationDialogComponent {
    readonly user = signal<User | undefined>(undefined);

    protected readonly activeModal = inject(NgbActiveModal);
}
