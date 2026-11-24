// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-add-enrolment-information-dialog',
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <h1 class="xm-modal-title">{{ 'i18n_student_enrolment_info' | translate }}</h1>
        </div>
        <div class="modal-body xm-stack xm-gap-1">
            <label for="enrolment-information">{{ 'i18n_student_enrolment_info_description' | translate }}</label>
            <textarea
                id="enrolment-information"
                rows="10"
                class="form-control"
                [value]="information"
                (input)="information = $any($event.target).value"
            >
            </textarea>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline-secondary" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
            <button class="btn btn-success" (click)="ok()">
                {{ 'i18n_button_save' | translate }}
            </button>
        </div>
    `,
})
export class AddEnrolmentInformationDialogComponent {
    information: string = '';

    readonly activeModal = inject(NgbActiveModal);

    ok = () => this.activeModal.close(this.information);
    cancel = () => this.activeModal.dismiss();
}
