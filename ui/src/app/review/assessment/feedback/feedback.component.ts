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
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { ExamParticipation } from '../../../exam/exam.model';
import type { Examination } from '../../../examination/examination.model';
import { AttachmentService } from '../../../shared/attachment/attachment.service';
import type { FileResult } from '../../../shared/attachment/dialogs/attachment-picker.component';
import { FileService } from '../../../shared/file/file.service';
import { AssessmentService } from '../assessment.service';
import { CollaborativeAssesmentService } from '../collaborative-assessment.service';

@Component({
    selector: 'xm-r-feedback',
    template: `<div id="feedback">
        <div cdkDrag id="draggable" class="wrapper">
            <div class="row align-items-center">
                <div
                    class="col-1"
                    ngbPopover="{{ (hideEditor ? 'sitnet_show' : 'sitnet_hide') | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <i
                        (click)="toggleFeedbackVisibility()"
                        class="pointer font-6"
                        [ngClass]="hideEditor ? 'bi-chevron-right' : 'bi-chevron-down'"
                    >
                    </i>
                </div>
                <div class="col-11">
                    {{ title | translate }}
                </div>
            </div>
            <div [ngbCollapse]="hideEditor" class="body">
                <div class="row mt-2 mb-1">
                    <div class="col-md-12">
                        <xm-ckeditor
                            id="feedback-editor"
                            [enableClozeTest]="false"
                            [(ngModel)]="exam.examFeedback.comment"
                            #ck="ngModel"
                            name="ck"
                            rows="10"
                            cols="80"
                        ></xm-ckeditor>
                    </div>
                </div>
                <div class="d-flex justify-content-end" *ngIf="exam.examFeedback?.attachment">
                    <a class="pointer" (click)="downloadFeedbackAttachment()">{{
                        exam.examFeedback?.attachment?.fileName
                    }}</a>
                    <span class="sitnet-red pointer" (click)="removeFeedbackAttachment()">
                        <i class="bi-x" title="{{ 'sitnet_remove_attachment' | translate }}"></i>
                    </span>
                </div>
                <div class="d-flex justify-content-between mt-2">
                    <button class="btn btn-outline-secondary" (click)="saveFeedback()">
                        {{ 'sitnet_save' | translate }}
                    </button>
                    <button type="button" class="btn btn-outline-secondary" (click)="selectFile()">
                        {{ 'sitnet_attach_file' | translate }}
                    </button>
                </div>
            </div>
        </div>
    </div> `,
})
export class FeedbackComponent implements OnInit {
    @Input() exam!: Examination;
    @Input() collaborative = false;
    @Input() participation!: ExamParticipation;
    feedbackComment = '';
    title = '';

    hideEditor = false;
    id = 0;
    ref = '';

    constructor(
        private route: ActivatedRoute,
        private Assessment: AssessmentService,
        private CollaborativeAssessment: CollaborativeAssesmentService,
        private Attachment: AttachmentService,
        private Files: FileService,
    ) {}

    ngOnInit() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
        this.title =
            this.exam.executionType.type === 'MATURITY' ? 'sitnet_give_content_statement' : 'sitnet_give_feedback';
    }

    toggleFeedbackVisibility = () => (this.hideEditor = !this.hideEditor);

    saveFeedback = () => {
        if (this.collaborative) {
            this._saveCollaborativeFeedback$().subscribe();
        } else {
            this._saveFeedback$().subscribe();
        }
    };

    selectFile = () => {
        this.Attachment.selectFile(false, {}).then((res: FileResult) => {
            if (this.collaborative) {
                this._saveCollaborativeFeedback$().subscribe(() =>
                    this._upload(res, `/app/iop/collab/attachment/exam/${this.id}/${this.ref}/feedback`),
                );
            } else {
                this._saveFeedback$().subscribe(() =>
                    this._upload(res, `/app/attachment/exam/${this.exam.id}/feedback`),
                );
            }
        });
    };

    downloadFeedbackAttachment = () => {
        const attachment = this.exam.examFeedback?.attachment;
        if (!attachment) {
            return;
        }
        this.collaborative && attachment.externalId
            ? this.Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName)
            : this.Attachment.downloadFeedbackAttachment(this.exam);
    };

    removeFeedbackAttachment = () => {
        if (this.collaborative) {
            this.Attachment.removeCollaborativeExamFeedbackAttachment(this.id, this.ref, this.participation);
        } else {
            this.Attachment.removeFeedbackAttachment(this.exam);
        }
    };

    private _saveFeedback$ = () => this.Assessment.saveFeedback$(this.exam);

    private _saveCollaborativeFeedback$ = () =>
        this.CollaborativeAssessment.saveFeedback$(this.id, this.ref, this.participation);

    private _upload = (res: FileResult, url: string) =>
        this.Files.upload(
            url,
            res.$value.attachmentFile,
            { examId: this.exam.id.toString() },
            this.exam.examFeedback,
            () => {
                // kinda hacky, but let's do this mangling for time being
                this.participation._rev = this.exam.examFeedback?.attachment?.rev;
                delete this.exam.examFeedback?.attachment?.rev;
            },
        );
}
