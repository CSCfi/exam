// SPDX-FileCopyrightText: The members of the EXAM Consortium
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
                <label for="inspectionComment">{{ 'i18n_inspection_comment_description' | translate }}</label>
                <textarea
                    id="inspectionComment"
                    rows="10"
                    class="comment"
                    [formField]="commentForm.comment"
                    autofocus
                ></textarea>
            </form>
        </div>
        <div class="xm-cluster dialog-actions">
            <button class="btn btn-outline-secondary" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
            <button class="btn btn-success" [disabled]="commentForm.comment().invalid()" (click)="ok()">
                {{ 'i18n_add' | translate }}
            </button>
        </div>
    `,
    styles: `
        .comment {
            width: 100%;
        }
        .dialog-actions {
            justify-content: flex-end;
            gap: var(--xm-space-3);
            margin: var(--xm-space-3);
        }
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
