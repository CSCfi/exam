// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CdkDrag } from '@angular/cdk/drag-drop';
import { NgClass } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbCollapse, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { switchMap } from 'rxjs/operators';
import type { Exam } from 'src/app/exam/exam.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { MaturityService } from 'src/app/review/assessment/maturity/maturity.service';
import { Attachment, FileResult } from 'src/app/shared/attachment/attachment.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { CKEditorComponent } from 'src/app/shared/ckeditor/ckeditor.component';
import { FileService } from 'src/app/shared/file/file.service';

@Component({
    selector: 'xm-r-statement',
    templateUrl: './feedback.template.html',
    imports: [CdkDrag, NgbPopover, NgClass, CKEditorComponent, NgbCollapse, FormsModule, TranslateModule],
    styleUrl: './feedback.component.scss',
})
export class StatementComponent {
    @Input() exam!: Exam;

    hideEditor = true;

    private Attachment = inject(AttachmentService);
    private Files = inject(FileService);
    private Maturity = inject(MaturityService);
    private Assessment = inject(AssessmentService);

    get fixPosition() {
        return this.Assessment.fixPosition;
    }

    get shouldHide() {
        return !!this.exam.languageInspection?.finishedAt;
    }

    get title() {
        return 'i18n_give_statement';
    }

    get editorContent() {
        return this.exam.languageInspection.statement.comment || '';
    }

    get attachment() {
        return this.exam.languageInspection?.statement?.attachment;
    }

    set editorContent(value: string) {
        this.exam.languageInspection.statement.comment = value;
    }

    toggleVisibility = () => (this.hideEditor = !this.hideEditor);

    save = () => this.Maturity.saveInspectionStatement$(this.exam).subscribe();

    downloadAttachment = () => this.Attachment.downloadStatementAttachment(this.exam);

    removeAttachment = () => this.Attachment.removeStatementAttachment(this.exam);

    selectFile = () =>
        this.Attachment.selectFile$(false, {})
            .pipe(
                switchMap((res: FileResult) =>
                    this.Maturity.saveInspectionStatement$(this.exam).pipe(
                        switchMap(() =>
                            this.Files.upload$<Attachment>(
                                `/app/attachment/exam/${this.exam.id}/statement`,
                                res.$value.attachmentFile,
                                { examId: this.exam.id.toString() },
                            ),
                        ),
                    ),
                ),
            )
            .subscribe((resp) => {
                this.exam.languageInspection.statement.attachment = resp;
            });
}
