/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
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
        <div id="exam-dialog" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h1 class="xm-page-header-title">{{ 'i18n_accept_useragreement' | translate }}</h1>
            </div>
            <div class="modal-body">
                <div [innerHtml]="settings.eula.value"></div>
            </div>
            <div class="modal-footer">
                <button class="xm-ok-button" (click)="activeModal.close()" autofocus>
                    {{ 'i18n_button_accept' | translate }}
                </button>
                <button class="xm-cancel-button float-start" (click)="activeModal.dismiss()">
                    {{ 'i18n_button_decline' | translate }}
                </button>
            </div>
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
