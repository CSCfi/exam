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
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { EnrolmentInfo } from '../../enrolment.model';

@Component({
    selector: 'xm-add-enrolment-information-dialog',
    standalone: true,
    imports: [FormsModule, TranslateModule],
    template: `
        <div id="exam-modal" role="dialog" aria-modal="true">
            <div class="modal-header">
                <h1 class="xm-modal-title">{{ 'i18n_student_enrolment_info' | translate }}</h1>
            </div>
            <div class="modal-body">
                <form role="form" id="infoForm" name="infoForm" novalidate>
                    {{ 'i18n_student_enrolment_info_description' | translate }}
                    <textarea
                        name="info"
                        aria-label="write additional information for the examiner"
                        rows="10"
                        class="mt-1 w-100"
                        [(ngModel)]="information"
                    >
                    </textarea>
                </form>
            </div>
            <div class="modal-footer">
                <button class="xm-ok-button" (click)="ok()">
                    {{ 'i18n_button_save' | translate }}
                </button>
                <button class="xm-cancel-button float-start" (click)="cancel()">
                    {{ 'i18n_button_cancel' | translate }}
                </button>
            </div>
        </div>
    `,
})
export class AddEnrolmentInformationDialogComponent {
    @Input() information!: EnrolmentInfo;

    constructor(public activeModal: NgbActiveModal) {}

    ok = () => this.activeModal.close(this.information);
    cancel = () => this.activeModal.dismiss();
}
