// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Exam } from 'src/app/exam/exam.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { CKEditorComponent } from 'src/app/shared/ckeditor/ckeditor.component';

@Component({
    selector: 'xm-speed-review-feedback',
    imports: [FormsModule, TranslateModule, CKEditorComponent],
    template: `
        <div class="modal-header">
            <div class="xm-modal-title">{{ 'i18n_give_feedback' | translate }}</div>
        </div>
        <div class="modal-body feedback-body">
            @if (exam()) {
                <xm-ckeditor
                    [data]="exam()?.examFeedback?.comment ?? ''"
                    (dataChange)="commentChanged($event)"
                    autofocus
                ></xm-ckeditor>
            }
        </div>
        <div class="xm-dialog-actions">
            <button class="btn btn-outline-secondary" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
            <button class="btn btn-success" (click)="ok()">
                {{ 'i18n_save' | translate }}
            </button>
        </div>
    `,
    styles: `
        @use '../../../shared/grid';

        // The editor starts a quarter rem left of the dialog body padding, as under the former grid
        .feedback-body {
            padding-inline-start: grid.$col-padding;
        }
    `,
})
export class SpeedReviewFeedbackComponent {
    readonly exam = signal<Exam | undefined>(undefined);

    private readonly modal = inject(NgbActiveModal);
    private readonly Assessment = inject(AssessmentService);

    commentChanged(event: string) {
        const exam = this.exam()!;
        exam.examFeedback ??= { comment: '' };
        exam.examFeedback.comment = event;
    }

    ok() {
        const examValue = this.exam()!;
        if (!examValue.examFeedback) {
            examValue.examFeedback = { comment: '', feedbackStatus: false };
        }
        this.Assessment.saveFeedback$(examValue).subscribe(this.modal.close);
    }

    cancel() {
        this.modal.dismiss();
    }
}
