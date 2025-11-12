// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <h1 class="xm-modal-title">{{ 'i18n_accept_useragreement' | translate }}</h1>
        </div>
        <div class="modal-body">
            <div [innerHtml]="settings().eula.value"></div>
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EulaDialogComponent {
    settings = signal<{ eula: { value: string } }>({ eula: { value: '' } });

    activeModal = inject(NgbActiveModal);
    private http = inject(HttpClient);

    constructor() {
        this.http
            .get<{ value: string }>('/app/settings/agreement')
            .subscribe((resp) => this.settings.set({ eula: { value: resp.value } }));
    }
}
