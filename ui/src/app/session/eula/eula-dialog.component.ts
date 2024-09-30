// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-xm-eula-dialog',
    standalone: true,
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <h1 class="xm-modal-title">{{ 'i18n_accept_useragreement' | translate }}</h1>
        </div>
        <div class="modal-body">
            <div [innerHtml]="settings.eula.value"></div>
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
export class EulaDialogComponent implements OnInit {
    settings = { eula: { value: '' } };

    constructor(
        public activeModal: NgbActiveModal,
        private http: HttpClient,
    ) {}

    ngOnInit() {
        this.http
            .get<{ value: string }>('/app/settings/agreement')
            .subscribe((resp) => (this.settings = { eula: { value: resp.value } }));
    }
}
