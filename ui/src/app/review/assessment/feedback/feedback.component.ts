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
            <div class="row">
                <div
                    class="col-md-1 min-w-100"
                    ngbPopover="{{ (hideEditor ? 'sitnet_show' : 'sitnet_hide') | translate }}"
                    popoverTitle="{{ 'sitnet_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <i
                        (click)="toggleFeedbackVisibility()"
                        class="pointer vcenter font-6"
                        [ngClass]="
                            hideEditor
                                ? 'bi-arrow-right-circle-fill sitnet-green'
                                : 'bi-arrow-down-circle-fill sitnet-red'
                        "
                    >
                    </i>
                </div>
                <div class="col-md-11">
                    <div class="vcenter">
                        {{ 'sitnet_give_feedback' | translate }}
                    </div>
                </div>
            </div>
            <div [hidden]="hideEditor" class="body">
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
                this._saveCollaborativeFeedback$().subscribe(() => {
                    const url = `/app/iop/attachment/exam/${this.id}/${this.ref}/feedback`;
                    this._upload(res, url);
                });
            } else {
                this._saveFeedback$().subscribe(() => {
                    const url = `/app/attachment/exam/${this.exam.id}/feedback`;
                    this._upload(res, url);
                });
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
