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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { Exam } from '../../exam.model';

@Component({
    selector: 'xm-publication-dialog',
    standalone: true,
    imports: [TranslateModule],
    template: `<div id="exam-dialog" role="dialog" aria-modal="true">
        <div class="modal-header">
            <div class="xm-page-header-title">{{ getTitle() | translate }}</div>
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
        <div class="modal-footer">
            <button class="xm-ok-button" (click)="activeModal.close()" autofocus>
                {{ 'i18n_button_ok' | translate }}
            </button>
            <button class="xm-cancel-button" (click)="activeModal.dismiss()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    </div>`,
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
