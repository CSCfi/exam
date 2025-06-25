// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { Exam } from 'src/app/exam/exam.model';

@Component({
    selector: 'xm-publication-dialog',
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <div class="xm-modal-title">{{ getTitle() | translate }}</div>
        </div>
        <div class="modal-body">
            <p>
                {{ getConfirmationText() }}
            </p>
            @if (exam.examFeedbackConfig) {
                <p>
                    {{ 'i18n_exam_feedback_config_confirmation' | translate }}
                </p>
            }
        </div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-success" (click)="activeModal.close()" autofocus>
                {{ 'i18n_button_ok' | translate }}
            </button>
            <button class="btn btn-outline-secondary me-3" (click)="activeModal.dismiss()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
})
export class PublicationDialogComponent {
    @Input() exam!: Exam;
    @Input() prePublication = false;

    constructor(
        public activeModal: NgbActiveModal,
        private translate: TranslateService,
    ) {}

    getConfirmationText = () => {
        let confirmation = this.prePublication
            ? this.translate.instant('i18n_pre_publish_exam_confirm')
            : this.translate.instant('i18n_publish_exam_confirm');
        if (this.exam.executionType.type !== 'PRINTOUT' && !this.prePublication) {
            confirmation += ' ' + this.translate.instant('i18n_publish_exam_confirm_enroll');
        }
        return confirmation;
    };

    getTitle = () =>
        this.prePublication ? 'i18n_pre_publish_exam_confirm_dialog_title' : 'i18n_publish_exam_confirm_dialog_title';
}
