// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { Exam } from 'src/app/exam/exam.model';

@Component({
    selector: 'xm-publication-dialog',
    imports: [TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="modal-header">
            <div class="xm-modal-title">{{ getTitle() | translate }}</div>
        </div>
        <div class="modal-body">
            <p>
                {{ getConfirmationText() }}
            </p>
            @if (exam().examFeedbackConfig) {
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
    exam = input.required<Exam>();
    prePublication = input(false);

    activeModal = inject(NgbActiveModal);
    private translate = inject(TranslateService);

    getConfirmationText() {
        const currentPrePublication = this.prePublication();
        const currentExam = this.exam();
        let confirmation = currentPrePublication
            ? this.translate.instant('i18n_pre_publish_exam_confirm')
            : this.translate.instant('i18n_publish_exam_confirm');
        if (currentExam.executionType.type !== 'PRINTOUT' && !currentPrePublication) {
            confirmation += ' ' + this.translate.instant('i18n_publish_exam_confirm_enroll');
        }
        return confirmation;
    }

    getTitle() {
        return this.prePublication()
            ? 'i18n_pre_publish_exam_confirm_dialog_title'
            : 'i18n_publish_exam_confirm_dialog_title';
    }
}
