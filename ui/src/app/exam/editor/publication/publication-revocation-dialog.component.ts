/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-publication-revoke-dialog',
    standalone: true,
    imports: [TranslateModule],
    template: `<div id="exam-dialog" role="dialog" aria-modal="true">
        <div class="modal-header">
            <div class="xm-page-header-title">{{ 'i18n_unpublish_exam_confirm_dialog_title' | translate }}</div>
        </div>
        <div class="modal-body">
            <p>
                {{ 'i18n_unpublish_exam_confirm' | translate }}
            </p>
        </div>
        <div class="modal-footer">
            <button class="xm-ok-button" (click)="activeModal.close()" autofocus>
                {{ 'i18n_unpublish_exam' | translate }}
            </button>
            <button class="xm-cancel-button float-start" (click)="activeModal.dismiss()">
                {{ 'i18n_close' | translate }}
            </button>
        </div>
    </div> `,
})
export class PublicationRevocationDialogComponent {
    constructor(public activeModal: NgbActiveModal) {}
}
