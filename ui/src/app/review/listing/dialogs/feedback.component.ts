// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input, OnInit, inject } from '@angular/core';
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
        <div class="modal-body ms-2">
            <div class="row">
                @if (exam.examFeedback !== null) {
                    <div class="col-md-12 ps-0">
                        <xm-ckeditor
                            [data]="exam.examFeedback.comment"
                            (dataChange)="commentChanged($event)"
                            autofocus
                        ></xm-ckeditor>
                    </div>
                }
            </div>
        </div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn btn-success" (click)="ok()">
                {{ 'i18n_save' | translate }}
            </button>
            <button class="btn btn-outline-secondary me-3" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
})
export class SpeedReviewFeedbackComponent implements OnInit {
    @Input() exam!: Exam;

    private modal = inject(NgbActiveModal);
    private Assessment = inject(AssessmentService);

    ngOnInit() {
        if (!this.exam.examFeedback) {
            this.exam.examFeedback = { comment: '' };
        }
    }

    commentChanged = (event: string) => (this.exam.examFeedback.comment = event);

    ok = () => {
        if (!this.exam.examFeedback) {
            this.exam.examFeedback = { comment: '', feedbackStatus: false };
        }
        this.Assessment.saveFeedback$(this.exam).subscribe(this.modal.close);
    };

    cancel = () => this.modal.dismiss();
}
