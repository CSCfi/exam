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
    selector: 'xm-show-instructions-dialog',
    template: `<div id="sitnet-dialog" role="dialog" aria-modal="true">
        <div class="modal-header">
            <div class="modal-title">
                <div class="student-enroll-title">{{ title | translate }}</div>
            </div>
        </div>
        <div class="modal-body" [xmMathJax]="instructions"></div>
        <div class="modal-footer">
            <div class="student-message-dialog-button-save">
                <button class="btn btn-sm btn-primary" (click)="ok()" autofocus>
                    {{ 'sitnet_button_ok' | translate }}
                </button>
            </div>
        </div>
    </div> `,
})
export class ShowInstructionsDialogComponent {
    @Input() instructions = '';
    @Input() title = '';

    constructor(public activeModal: NgbActiveModal) {}

    ok = () => this.activeModal.close();
}
