// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-add-enrolment-information-dialog',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <h1 class="xm-modal-title">{{ 'i18n_student_enrolment_info' | translate }}</h1>
        </div>
        <div class="modal-body">
            {{ 'i18n_student_enrolment_info_description' | translate }}
            <textarea
                aria-label="write additional information for the examiner"
                rows="10"
                class="mt-1 w-100"
                [value]="information"
                (input)="information = $any($event.target).value"
            >
            </textarea>
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
    information: string = '';

    readonly activeModal = inject(NgbActiveModal);

    ok = () => this.activeModal.close(this.information);
    cancel = () => this.activeModal.dismiss();
}
