// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-r-inspection-comment',
    imports: [FormField, TranslateModule],
    template: `
        <div class="modal-header">
            <h1 class="xm-modal-title">{{ 'i18n_inspection_comment_title' | translate }}</h1>
        </div>
        <div class="modal-body">
            <form id="infoForm" novalidate>
                <label for="infoForm">{{ 'i18n_inspection_comment_description' | translate }}</label>
                <textarea rows="10" class="w-100" [formField]="commentForm.comment" autofocus> </textarea>
            </form>
        </div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-success" [disabled]="commentForm.comment().invalid()" (click)="ok()">
                {{ 'i18n_add' | translate }}
            </button>
            <button class="btn btn-outline-secondary me-3" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
})
export class InspectionCommentDialogComponent {
    readonly commentForm = form(signal({ comment: '' }), (path) => {
        required(path.comment);
    });

    private readonly modal = inject(NgbActiveModal);

    ok = () => this.modal.close({ comment: this.commentForm.comment().value() });
    cancel = () => this.modal.dismiss();
}
