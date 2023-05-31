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

@Component({
    selector: 'xm-publication-revoke-dialog',
    template: `<div id="sitnet-dialog" role="dialog" aria-modal="true">
        <div class="student-message-dialog-wrapper-padding">
            <div class="student-enroll-dialog-wrap">
                <div class="student-enroll-title">{{ 'sitnet_unpublish_exam_confirm_dialog_title' | translate }}</div>
            </div>
            <div class="modal-body">
                <p>
                    {{ 'sitnet_unpublish_exam_confirm' | translate }}
                </p>
            </div>
            <div class="student-message-dialog-footer">
                <div class="student-message-dialog-button-save marl10">
                    <button class="btn btn-sm btn-primary nowdt" (click)="activeModal.close()" autofocus>
                        {{ 'sitnet_unpublish_exam' | translate }}
                    </button>
                </div>
                <div class="student-message-dialog-button-cancel">
                    <button class="btn btn-sm btn-danger float-start" (click)="activeModal.dismiss()">
                        {{ 'sitnet_close' | translate }}
                    </button>
                </div>
            </div>
        </div>
    </div> `,
})
export class PublicationRevocationDialogComponent {
    constructor(public activeModal: NgbActiveModal) {}
}
