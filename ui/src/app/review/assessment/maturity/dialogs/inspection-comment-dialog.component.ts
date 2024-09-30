// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

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
