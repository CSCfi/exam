// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { EnrolmentInfo } from 'src/app/enrolment/enrolment.model';

@Component({
    selector: 'xm-add-enrolment-information-dialog',
    imports: [FormsModule, TranslateModule],
    template: `
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
            <div class="d-flex flex-row-reverse flex-align-r">
                <button class="btn btn-success" (click)="ok()">
                    {{ 'i18n_button_save' | translate }}
                </button>
                <button class="btn btn-outline-secondary me-3" (click)="cancel()">
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
