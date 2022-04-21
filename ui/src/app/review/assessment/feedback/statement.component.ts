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
import { Component, Input } from '@angular/core';
import type { Exam } from '../../../exam/exam.model';
import { AttachmentService } from '../../../shared/attachment/attachment.service';
import type { FileResult } from '../../../shared/attachment/dialogs/attachment-picker.component';
import { FileService } from '../../../shared/file/file.service';
import { MaturityService } from '../maturity/maturity.service';

@Component({
    selector: 'xm-r-statement',
    template: `<div id="feedback" [hidden]="hasGoneThroughLanguageInspection()">
        <div cdkDrag id="draggable" class="wrapper">
            <div class="row">
                <div
                    class="col-md-1"
                    ngbPopover="{{ (hideEditor ? 'sitnet_show' : 'sitnet_hide') | translate }}"
                    popoverTitle="{{ 'sitnet_instructions' | translate }}"
                    triggers="mouseenter:mouseleave"
                >
                    <i
                        (click)="toggleEditorVisibility()"
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
                        {{ 'sitnet_give_statement' | translate }}
                    </div>
                </div>
            </div>
            <div [hidden]="hideEditor" class="body">
                <div class="row editor">
                    <div class="col-md-12">
                        <xm-ckeditor
                            [enableClozeTest]="false"
                            [(ngModel)]="exam.languageInspection.statement.comment"
                            #ck="ngModel"
                            name="ck"
                        ></xm-ckeditor>
                    </div>
                </div>
                <div class="d-flex justify-content-between">
                    <div>
                        <button class="btn btn-outline-secondary" (click)="saveInspectionStatement()">
                            {{ 'sitnet_save' | translate }}
                        </button>
                    </div>
                    <div>
                        <span *ngIf="exam.languageInspection?.statement?.attachment">
                            <a class="pointer" (click)="downloadStatementAttachment()">{{
                                exam.languageInspection?.statement?.attachment?.fileName
                            }}</a>
                            <span class="sitnet-red pointer" (click)="removeStatementAttachment()">
                                <i class="bi-x" title="{{ 'sitnet_remove_attachment' | translate }}"></i>
                            </span>
                        </span>
                        <button type="button" class="btn btn-outline-secondary" (click)="selectFile()">
                            {{ 'sitnet_attach_file' | translate }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div> `,
})
export class StatementComponent {
    @Input() exam!: Exam;
    hideEditor = false;

    constructor(private Attachment: AttachmentService, private Files: FileService, private Maturity: MaturityService) {}

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
