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
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-r-inspection-comment',
    standalone: true,
    imports: [FormsModule, TranslateModule],
    template: `
        <div class="modal-header">
            <h1 class="xm-modal-title">{{ 'i18n_inspection_comment_title' | translate }}</h1>
        </div>
        <div class="modal-body">
            <form role="form" id="infoForm" name="infoForm" novalidate>
                <label for="infoForm">{{ 'i18n_inspection_comment_description' | translate }}</label>
                <textarea rows="10" name="message" class="w-100" [(ngModel)]="data.comment" autofocus> </textarea>
            </form>
        </div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-success" [disabled]="!data.comment" (click)="ok()">
                {{ 'i18n_add' | translate }}
            </button>
            <button class="btn btn-outline-secondary me-3" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
})
export class InspectionCommentDialogComponent {
    data = { comment: '' };
    constructor(private modal: NgbActiveModal) {}

    ok = () => this.modal.close(this.data);
    cancel = () => this.modal.dismiss();
}
