// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CdkDrag } from '@angular/cdk/drag-drop';
import { NgClass } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbCollapse, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';
import type { Examination } from 'src/app/examination/examination.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { CollaborativeAssesmentService } from 'src/app/review/assessment/collaborative-assessment.service';
import { MaturityService } from 'src/app/review/assessment/maturity/maturity.service';
import { Attachment, FileResult } from 'src/app/shared/attachment/attachment.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { CKEditorComponent } from 'src/app/shared/ckeditor/ckeditor.component';
import { FileService } from 'src/app/shared/file/file.service';

export type FeedbackType = 'statement' | 'feedback';

@Component({
    selector: 'xm-r-feedback',
    template: `<div
        cdkDrag
        [cdkDragConstrainPosition]="fixPosition"
        class="wrapper"
        [hidden]="isHidden()"
    >
        <div class="row align-items-center">
            <div
                class="col-1"
                ngbPopover="{{ (hideEditor ? 'i18n_show' : 'i18n_hide') | translate }}"
                triggers="mouseenter:mouseleave"
            >
                <i
                    (click)="toggleEditorVisibility()"
                    class="pointer"
                    [ngClass]="hideEditor ? 'bi-chevron-right' : 'bi-chevron-down'"
                >
                </i>
            </div>
            <div class="col-11">
                {{ getTitle() | translate }}
            </div>
        </div>
        <div [ngbCollapse]="hideEditor" class="body">
            <div class="row mt-2 mb-1">
                <div class="col-md-12">
                    <xm-ckeditor
                        [id]="getEditorId()"
                        [enableClozeTest]="false"
                        [ngModel]="getCommentModel()"
                        (ngModelChange)="setCommentModel($event)"
                        #ck="ngModel"
                        name="ck"
                        rows="10"
                        cols="80"
                    ></xm-ckeditor>
                </div>
            </div>
            @if (hasAttachment()) {
                <div class="d-flex justify-content-end align-items-center">
                    <a class="pointer" (click)="downloadAttachment()">{{
                        getAttachmentFileName()
                    }}</a>
                    <button
                        type="button"
                        class="btn btn-link text-danger ms-2"
                        (click)="removeAttachment()"
                        [attr.aria-label]="'i18n_remove_attachment' | translate"
                        [title]="'i18n_remove_attachment' | translate"
                    >
                        <i class="bi-trash" aria-hidden="true"></i>
                    </button>
                </div>
            }
            <div class="d-flex justify-content-between flex-row-reverse mt-2">
                <button class="btn btn-outline-success" (click)="saveFeedback()">
                    {{ 'i18n_save' | translate }}
                </button>
                <button type="button" class="btn btn-outline-secondary" (click)="selectFile()">
                    {{ 'i18n_attach_file' | translate }}
                </button>
            </div>
        </div>
    </div>`,
    imports: [CdkDrag, NgbPopover, NgClass, CKEditorComponent, NgbCollapse, FormsModule, TranslateModule],
    styleUrl: './feedback.component.scss',
})
export class FeedbackComponent implements OnInit {
    @Input() exam!: Exam | Examination;
    @Input() type: FeedbackType = 'feedback';
    @Input() collaborative = false;
    @Input() participation?: ExamParticipation;
    @Input() hidden = false;

    hideEditor = false;
    private id = 0;
    private ref = '';

    private route = inject(ActivatedRoute);
    private Assessment = inject(AssessmentService);
    private CollaborativeAssessment = inject(CollaborativeAssesmentService);
    private Maturity = inject(MaturityService);
    private Attachment = inject(AttachmentService);
    private Files = inject(FileService);

    get fixPosition() {
        return this.Assessment.fixPosition;
    }

    ngOnInit() {
        if (this.collaborative) {
            this.id = this.route.snapshot.params.id;
            this.ref = this.route.snapshot.params.ref;
        }
    }

    // Title logic
    getTitle(): string {
        if (this.type === 'statement') {
            return 'i18n_give_statement';
        }
        
        const exam = this.exam as Examination;
        return exam.executionType.type === 'MATURITY' ? 'i18n_give_content_statement' : 'i18n_give_feedback';
    }

    // Editor ID logic
    getEditorId(): string {
        return this.type === 'statement' ? 'statement-editor' : 'feedback-editor';
    }

    // Comment model logic
    getCommentModel(): string {
        if (this.type === 'statement') {
            const exam = this.exam as Exam;
            return exam.languageInspection?.statement?.comment || '';
        } else {
            const exam = this.exam as Examination;
            return exam.examFeedback?.comment || '';
        }
    }

    setCommentModel(value: string): void {
        if (this.type === 'statement') {
            const exam = this.exam as Exam;
            if (exam.languageInspection?.statement) {
                exam.languageInspection.statement.comment = value;
            }
        } else {
            const exam = this.exam as Examination;
            if (exam.examFeedback) {
                exam.examFeedback.comment = value;
            }
        }
    }

    // Attachment logic
    hasAttachment(): boolean {
        if (this.type === 'statement') {
            const exam = this.exam as Exam;
            return !!exam.languageInspection?.statement?.attachment;
        } else {
            const exam = this.exam as Examination;
            return !!exam.examFeedback?.attachment;
        }
    }

    getAttachmentFileName(): string {
        if (this.type === 'statement') {
            const exam = this.exam as Exam;
            return exam.languageInspection?.statement?.attachment?.fileName || '';
        } else {
            const exam = this.exam as Examination;
            return exam.examFeedback?.attachment?.fileName || '';
        }
    }

    // Visibility logic
    isHidden(): boolean {
        if (this.hidden) {
            return true;
        }
        
        if (this.type === 'statement') {
            const exam = this.exam as Exam;
            return !!exam.languageInspection?.finishedAt;
        }
        
        return false;
    }

    // Action methods
    toggleEditorVisibility = () => (this.hideEditor = !this.hideEditor);

    saveFeedback = () => {
        if (this.type === 'statement') {
            this.Maturity.saveInspectionStatement$(this.exam as Exam).subscribe();
        } else {
            if (this.collaborative) {
                this._saveCollaborativeFeedback$().subscribe();
            } else {
                this._saveFeedback$().subscribe();
            }
        }
    };

    selectFile = () => {
        this.Attachment.selectFile(false, {}).then((res: FileResult) => {
            if (this.type === 'statement') {
                this.Maturity.saveInspectionStatement$(this.exam as Exam).subscribe(() => {
                    this.Files.upload<Attachment>(
                        `/app/attachment/exam/${this.exam.id}/statement`,
                        res.$value.attachmentFile,
                        { examId: this.exam.id.toString() },
                    ).then((resp) => {
                        const exam = this.exam as Exam;
                        if (exam.languageInspection?.statement) {
                            exam.languageInspection.statement.attachment = resp;
                        }
                    });
                });
            } else {
                if (this.collaborative) {
                    this._saveCollaborativeFeedback$().subscribe(() =>
                        this._upload(res, `/app/iop/collab/attachment/exam/${this.id}/${this.ref}/feedback`),
                    );
                } else {
                    this._saveFeedback$().subscribe(() =>
                        this._upload(res, `/app/attachment/exam/${this.exam.id}/feedback`),
                    );
                }
            }
        });
    };

    downloadAttachment = () => {
        if (this.type === 'statement') {
            this.Attachment.downloadStatementAttachment(this.exam as Exam);
        } else {
            const exam = this.exam as Examination;
            const attachment = exam.examFeedback?.attachment;
            if (!attachment) {
                return;
            }
            if (this.collaborative && attachment.externalId) {
                this.Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName);
            } else {
                this.Attachment.downloadFeedbackAttachment(exam);
            }
        }
    };

    removeAttachment = () => {
        if (this.type === 'statement') {
            this.Attachment.removeStatementAttachment(this.exam as Exam);
        } else {
            const exam = this.exam as Examination;
            if (this.collaborative) {
                this.Attachment.removeCollaborativeExamFeedbackAttachment(this.id, this.ref, this.participation!);
            } else {
                this.Attachment.removeFeedbackAttachment(exam);
            }
        }
    };

    // Private helper methods for feedback
    private _saveFeedback$ = () => this.Assessment.saveFeedback$(this.exam as Examination);

    private _saveCollaborativeFeedback$ = () =>
        this.CollaborativeAssessment.saveFeedback$(this.id, this.ref, this.participation!);

    private _upload = (res: FileResult, url: string) =>
        this.Files.upload<Attachment>(url, res.$value.attachmentFile, { examId: this.exam.id.toString() }).then(
            (resp) => {
                const exam = this.exam as Examination;
                if (exam.examFeedback) {
                    exam.examFeedback.attachment = resp;
                    // kinda hacky, but let's do this mangling for time being
                    if (this.participation) {
                        this.participation._rev = exam.examFeedback?.attachment?.rev;
                        delete exam.examFeedback?.attachment?.rev;
                    }
                }
            },
        );
}
