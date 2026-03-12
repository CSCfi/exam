// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CdkDrag } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './feedback.template.html',
    imports: [CdkDrag, NgbPopover, NgbCollapse, CKEditorComponent, FormsModule, TranslateModule],
    styleUrl: './feedback.component.scss',
})
export class FeedbackComponent {
    readonly exam = input.required<Examination>();
    readonly collaborative = input(false);
    readonly participation = input<ExamParticipation>();
    readonly hidden = input(false);

    readonly hideEditor = signal(true);
    readonly shouldHide = computed(() => this.hidden());
    readonly attachment = computed(() => this.exam().examFeedback?.attachment);

    private readonly id: number;
    private readonly ref: string;

    private readonly route = inject(ActivatedRoute);
    private readonly Assessment = inject(AssessmentService);
    private readonly CollaborativeAssessment = inject(CollaborativeAssesmentService);
    private readonly Attachment = inject(AttachmentService);
    private readonly Files = inject(FileService);

    constructor() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
        effect(() => {
            if (this.exam().executionType.type === 'MATURITY') {
                this.hideEditor.set(false);
            }
        });
    }

    get fixPosition() {
        return this.Assessment.fixPosition;
    }

    get title() {
        return 'i18n_give_feedback';
    }

    get editorContent() {
        return this.exam().examFeedback.comment || '';
    }

    set editorContent(value: string) {
        this.exam().examFeedback.comment = value;
    }

    toggleVisibility = () => this.hideEditor.update((value) => !value);

    save = () => {
        if (this.collaborative()) {
            this._saveCollaborativeFeedback$().subscribe();
        } else {
            this._saveFeedback$().subscribe();
        }
    };

    downloadAttachment = () => {
        const attachmentValue = this.attachment();
        if (!attachmentValue) {
            return;
        }
        const examValue = this.exam();
        if (this.collaborative() && attachmentValue.externalId)
            this.Attachment.downloadCollaborativeAttachment(attachmentValue.externalId, attachmentValue.fileName);
        else this.Attachment.downloadFeedbackAttachment(examValue);
    };

    removeAttachment = () => {
        const examValue = this.exam();
        const participationValue = this.participation();
        if (this.collaborative()) {
            this.Attachment.removeCollaborativeExamFeedbackAttachment(this.id, this.ref, participationValue!);
        } else {
            this.Attachment.removeFeedbackAttachment(examValue);
        }
    };

    commentChanged = (event: string) => {
        this.exam().examFeedback.comment = event;
    };

    selectFile = () => {
        this.Attachment.selectFile$(false, {}).subscribe((res: FileResult) => {
            const examValue = this.exam();
            const participationValue = this.participation();
            const save$: Observable<unknown> = this.collaborative()
                ? this._saveCollaborativeFeedback$()
                : this._saveFeedback$();
            const url = this.collaborative()
                ? `/app/iop/collab/attachment/exam/${this.id}/${this.ref}/feedback`
                : `/app/attachment/exam/${examValue.id}/feedback`;

            save$
                .pipe(
                    switchMap(() =>
                        this.Files.upload$<Attachment>(url, res.$value.attachmentFile, {
                            examId: examValue.id.toString(),
                        }),
                    ),
                )
                .subscribe((resp) => {
                    examValue.examFeedback.attachment = resp;
                    if (participationValue) {
                        participationValue._rev = examValue.examFeedback?.attachment?.rev;
                        delete examValue.examFeedback?.attachment?.rev;
                    }
                });
        });
    };

    private _saveFeedback$ = () => this.Assessment.saveFeedback$(this.exam());

    private _saveCollaborativeFeedback$ = () =>
        this.CollaborativeAssessment.saveFeedback$(this.id, this.ref, this.participation()!);
}
