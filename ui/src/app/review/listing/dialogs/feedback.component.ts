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
import { NgIf } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { CKEditorComponent } from 'src/app/shared/ckeditor/ckeditor.component';
import type { Exam } from '../../../exam/exam.model';
import { AssessmentService } from '../../assessment/assessment.service';

@Component({
    selector: 'xm-speed-review-feedback',
    standalone: true,
    imports: [FormsModule, TranslateModule, NgIf, CKEditorComponent],
    template: `<div id="sitnet-dialog" role="dialog" aria-modal="true">
        <div class="student-details-title-wrap mart20">
            <div class="student-enroll-title">{{ 'i18n_give_feedback' | translate }}</div>
        </div>
        <div class="modal-body marl20">
            <div class="row">
                <div class="col-md-12 padl0" *ngIf="exam.examFeedback !== null">
                    <xm-ckeditor
                        rows="10"
                        #ck="ngModel"
                        [(ngModel)]="exam.examFeedback.comment"
                        autofocus
                    ></xm-ckeditor>
                </div>
            </div>
        </div>
        <div class="modal-footer d-flex justify-content-between">
            <button class="btn btn btn-success float-start" (click)="ok()">
                {{ 'i18n_save' | translate }}
            </button>
            <button class="btn btn-primary float-end" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    </div> `,
})
export class SpeedReviewFeedbackComponent implements OnInit {
    @Input() exam!: Exam;

    constructor(private modal: NgbActiveModal, private Assessment: AssessmentService) {}

    ngOnInit() {
        if (!this.exam.examFeedback) {
            this.exam.examFeedback = { comment: '' };
        }
    }

    ok = () => {
        if (!this.exam.examFeedback) {
            this.exam.examFeedback = { comment: '', feedbackStatus: false };
        }
        this.Assessment.saveFeedback$(this.exam).subscribe(this.modal.close);
    };

    cancel = () => this.modal.dismiss();
}
