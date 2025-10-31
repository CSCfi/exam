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
import type { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Examination } from 'src/app/examination/examination.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { CollaborativeAssesmentService } from 'src/app/review/assessment/collaborative-assessment.service';
import { Attachment, FileResult } from 'src/app/shared/attachment/attachment.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { CKEditorComponent } from 'src/app/shared/ckeditor/ckeditor.component';
import { FileService } from 'src/app/shared/file/file.service';

@Component({
    selector: 'xm-r-feedback',
    templateUrl: './feedback.template.html',
    imports: [CdkDrag, NgbPopover, NgClass, NgbCollapse, CKEditorComponent, FormsModule, TranslateModule],
    styleUrl: './feedback.component.scss',
})
export class FeedbackComponent implements OnInit {
    @Input() exam!: Examination;
    @Input() collaborative = false;
    @Input() participation?: ExamParticipation;
    @Input() hidden = false;

    hideEditor = true;
    private id = 0;
    private ref = '';

    private route = inject(ActivatedRoute);
    private Assessment = inject(AssessmentService);
    private CollaborativeAssessment = inject(CollaborativeAssesmentService);
    private Attachment = inject(AttachmentService);
    private Files = inject(FileService);

    get fixPosition() {
        return this.Assessment.fixPosition;
    }

    get shouldHide() {
        return this.hidden;
    }

    get title() {
        return 'i18n_give_feedback';
    }

    get editorContent() {
        return this.exam.examFeedback.comment || '';
    }

    get attachment() {
        return this.exam.examFeedback?.attachment;
    }

    set editorContent(value: string) {
        this.exam.examFeedback.comment = value;
    }

    ngOnInit() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
    }

    toggleVisibility = () => (this.hideEditor = !this.hideEditor);

    save = () => {
        if (this.collaborative) {
            this._saveCollaborativeFeedback$().subscribe();
        } else {
            this._saveFeedback$().subscribe();
        }
    };

    downloadAttachment = () => {
        const attachment = this.exam.examFeedback?.attachment;
        if (!attachment) {
            return;
        }
        if (this.collaborative && attachment.externalId)
            this.Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName);
        else this.Attachment.downloadFeedbackAttachment(this.exam);
    };

    removeAttachment = () => {
        if (this.collaborative) {
            this.Attachment.removeCollaborativeExamFeedbackAttachment(this.id, this.ref, this.participation!);
        } else {
            this.Attachment.removeFeedbackAttachment(this.exam);
        }
    };

    commentChanged = (event: string) => (this.exam.examFeedback.comment = event);
    selectFile = () => {
        this.Attachment.selectFile$(false, {}).subscribe((res: FileResult) => {
            const save$: Observable<unknown> = this.collaborative
                ? this._saveCollaborativeFeedback$()
                : this._saveFeedback$();
            const url = this.collaborative
                ? `/app/iop/collab/attachment/exam/${this.id}/${this.ref}/feedback`
                : `/app/attachment/exam/${this.exam.id}/feedback`;

            save$
                .pipe(
                    switchMap(() =>
                        this.Files.upload$<Attachment>(url, res.$value.attachmentFile, {
                            examId: this.exam.id.toString(),
                        }),
                    ),
                )
                .subscribe((resp) => {
                    this.exam.examFeedback.attachment = resp;
                    if (this.participation) {
                        this.participation._rev = this.exam.examFeedback?.attachment?.rev;
                        delete this.exam.examFeedback?.attachment?.rev;
                    }
                });
        });
    };

    private _saveFeedback$ = () => this.Assessment.saveFeedback$(this.exam);

    private _saveCollaborativeFeedback$ = () =>
        this.CollaborativeAssessment.saveFeedback$(this.id, this.ref, this.participation!);
}
