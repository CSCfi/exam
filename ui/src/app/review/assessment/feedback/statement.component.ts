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
import { CdkDrag } from '@angular/cdk/drag-drop';
import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbCollapse, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Exam } from '../../../exam/exam.model';
import { AttachmentService } from '../../../shared/attachment/attachment.service';
import type { FileResult } from '../../../shared/attachment/dialogs/attachment-picker.component';
import { CKEditorComponent } from '../../../shared/ckeditor/ckeditor.component';
import { FileService } from '../../../shared/file/file.service';
import { MaturityService } from '../maturity/maturity.service';
import { AssessmentService } from '../assessment.service';

@Component({
    selector: 'xm-r-statement',
    template: `<div
        cdkDrag
        [cdkDragConstrainPosition]="fixPosition"
        class="wrapper"
        [hidden]="hasGoneThroughLanguageInspection()"
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
                {{ 'i18n_give_statement' | translate }}
            </div>
        </div>
        <div [ngbCollapse]="hideEditor" class="body">
            <div class="row mt-2 mb-1">
                <div class="col-md-12">
                    <xm-ckeditor
                        [enableClozeTest]="false"
                        [(ngModel)]="exam.languageInspection.statement.comment"
                        #ck="ngModel"
                        name="ck"
                        rows="10"
                        cols="80"
                    ></xm-ckeditor>
                </div>
            </div>
            <div class="d-flex justify-content-between">
                <button class="btn btn-outline-secondary" (click)="saveInspectionStatement()">
                    {{ 'i18n_save' | translate }}
                </button>
                @if (exam.languageInspection?.statement?.attachment) {
                    <div class="d-flex justify-content-end">
                        <a class="pointer" (click)="downloadStatementAttachment()">{{
                            exam.examFeedback?.attachment?.fileName
                        }}</a>
                        <span class="sitnet-red pointer" (click)="removeStatementAttachment()">
                            <i class="bi-x" title="{{ 'i18n_remove_attachment' | translate }}"></i>
                        </span>
                    </div>
                }
                <div class="d-flex justify-content-between mt-2">
                    <button type="button" class="btn btn-outline-secondary" (click)="selectFile()">
                        {{ 'i18n_attach_file' | translate }}
                    </button>
                </div>
            </div>
        </div>
    </div>`,
    standalone: true,
    imports: [CdkDrag, NgbPopover, NgClass, CKEditorComponent, NgbCollapse, FormsModule, TranslateModule],
    styleUrl: './feedback.component.scss',
})
export class StatementComponent {
    @Input() exam!: Exam;

    fixPosition = this.Assessment.fixPosition;
    hideEditor = false;

    constructor(
        private Attachment: AttachmentService,
        private Files: FileService,
        private Maturity: MaturityService,
        private Assessment: AssessmentService,
    ) {}

    hasGoneThroughLanguageInspection = () => this.exam.languageInspection?.finishedAt;

    toggleEditorVisibility = () => (this.hideEditor = !this.hideEditor);

    saveInspectionStatement = () => this.Maturity.saveInspectionStatement$(this.exam).subscribe();

    downloadStatementAttachment = () => this.Attachment.downloadStatementAttachment(this.exam);

    removeStatementAttachment = () => this.Attachment.removeStatementAttachment(this.exam);

    selectFile = () => {
        this.Attachment.selectFile(false, {}).then((res: FileResult) =>
            this.Maturity.saveInspectionStatement$(this.exam).subscribe(() => {
                this.Files.upload(
                    `/app/attachment/exam/${this.exam.id}/statement`,
                    res.$value.attachmentFile,
                    { examId: this.exam.id.toString() },
                    this.exam.languageInspection?.statement,
                );
            }),
        );
    };
}
