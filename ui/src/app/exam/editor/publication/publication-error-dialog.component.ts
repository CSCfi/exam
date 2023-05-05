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

@Component({
    selector: 'xm-publication-error-dialog',
    template: `<div id="sitnet-dialog">
        <div class="student-message-dialog-wrapper-padding">
            <div class="student-enroll-dialog-wrap">
                <div class="student-enroll-title">{{ 'sitnet_please_check_following_infos' | translate }}</div>
            </div>
            <div class="modal-body">
                <p *ngFor="let error of errors">{{ error | translate }}</p>
            </div>
            <div class="modal-footer">
                <div class="student-message-dialog-button-save">
                    <button class="btn btn-sm btn-primary" (click)="activeModal.close()">
                        {{ 'sitnet_button_ok' | translate }}
                    </button>
                </div>
            </div>
        </div>
    </div> `,
})
export class PublicationErrorDialogComponent {
    @Input() errors: string[] = [];

    constructor(public activeModal: NgbActiveModal) {}
}
