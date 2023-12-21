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
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-inspection-statement-dialog',
    standalone: true,
    imports: [TranslateModule],
    template: `<div id="sitnet-dialog" role="dialog" aria-modal="true">
        <div class="student-message-dialog-wrapper-padding">
            <div class="student-enroll-dialog-wrap">
                <div class="student-enroll-title">{{ 'i18n_give_feedback' | translate }}</div>
            </div>
            <div class="mart20 student-feedback">
                <p mathjax [innerHtml]="statement"></p>
            </div>
            <div class="modal-footer">
                <div class="student-message-dialog-button-save">
                    <button class="btn btn-sm btn-primary" (click)="activeModal.close()" autofocus>
                        {{ 'i18n_close' | translate }}
                    </button>
                </div>
            </div>
        </div>
    </div> `,
})
export class InspectionStatementDialogComponent {
    @Input() statement: unknown;
    constructor(public activeModal: NgbActiveModal) {}
}
