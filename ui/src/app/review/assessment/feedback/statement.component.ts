// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CdkDrag } from '@angular/cdk/drag-drop';
import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './feedback.template.html',
    imports: [CdkDrag, NgbPopover, NgClass, CKEditorComponent, NgbCollapse, FormsModule, TranslateModule],
    styleUrl: './feedback.component.scss',
})
export class StatementComponent {
    exam = input.required<Exam>();

    hideEditor = signal(true);

    shouldHide = computed(() => !!this.exam().languageInspection?.finishedAt);
    attachment = computed(() => this.exam().languageInspection?.statement?.attachment);

    private Attachment = inject(AttachmentService);
    private Files = inject(FileService);
    private Maturity = inject(MaturityService);
    private Assessment = inject(AssessmentService);

    get fixPosition() {
        return this.Assessment.fixPosition;
    }

    get title() {
        return 'i18n_give_statement';
    }

    get editorContent() {
        return this.exam().languageInspection.statement.comment || '';
    }

    set editorContent(value: string) {
        this.exam().languageInspection.statement.comment = value;
    }

    commentChanged = (event: string) => {
        this.exam().languageInspection.statement.comment = event;
    };

    hasGoneThroughLanguageInspection = () => this.exam().languageInspection?.finishedAt;

    toggleVisibility = () => this.hideEditor.update((value) => !value);

    save = () => this.Maturity.saveInspectionStatement$(this.exam()).subscribe();

    downloadAttachment = () => this.Attachment.downloadStatementAttachment(this.exam());

    removeAttachment = () => this.Attachment.removeStatementAttachment(this.exam());

    selectFile = () =>
        this.Attachment.selectFile$(false, {})
            .pipe(
                switchMap((res: FileResult) => {
                    const examValue = this.exam();
                    return this.Maturity.saveInspectionStatement$(examValue).pipe(
                        switchMap(() =>
                            this.Files.upload$<Attachment>(
                                `/app/attachment/exam/${examValue.id}/statement`,
                                res.$value.attachmentFile,
                                { examId: examValue.id.toString() },
                            ),
                        ),
                    );
                }),
            )
            .subscribe((resp) => {
                this.exam().languageInspection.statement.attachment = resp;
            });
}
