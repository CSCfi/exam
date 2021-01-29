/*
 * Copyright (c) 2017 Exam Consortium
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
 */
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'r-inspection-comment',
    template: `
        <div id="sitnet-dialog">
            <div class="student-message-dialog-wrapper-padding">
                <div class="student-enroll-dialog-wrap">
                    <div class="student-enroll-title">{{ 'sitnet_inspection_comment_title' | translate }}</div>
                </div>
                <div>
                    <form role="form" id="infoForm" name="infoForm" novalidate>
                        <label for="infoForm" class="student-enroll-dialog-subtitle">{{
                            'sitnet_inspection_comment_description' | translate
                        }}</label>
                        <textarea rows="10" class="student-message-dialog-textarea" [(ngModel)]="data.comment">
                        </textarea>
                    </form>
                </div>
                <div class="student-message-dialog-footer">
                    <div class="student-message-dialog-button-save">
                        <button class="btn btn-sm btn-primary" [disabled]="!data.comment" (click)="ok()">
                            {{ 'sitnet_add' | translate }}
                        </button>
                    </div>
                    <div class="student-message-dialog-button-cancel">
                        <button class="btn btn-sm btn-danger pull-left" (click)="cancel()">
                            {{ 'sitnet_button_cancel' | translate }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class InspectionCommentDialogComponent {
    data = { comment: '' };
    constructor(private modal: NgbActiveModal) {}

    ok = () => this.modal.close(this.data);
    cancel = () => this.modal.dismiss();
}
