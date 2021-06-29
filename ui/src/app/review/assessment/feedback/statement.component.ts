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

import { Exam } from '../../../exam/exam.model';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { FileService } from '../../../utility/file/file.service';
import { MaturityService } from '../maturity/maturity.service';

import type { FileResult } from '../../../utility/attachment/dialogs/attachmentSelector.component';
@Component({
    selector: 'r-statement',
    templateUrl: './statement.component.html',
})
export class StatementComponent {
    @Input() exam: Exam;
    hideEditor = false;
    statement = '';

    constructor(private Attachment: AttachmentService, private Files: FileService, private Maturity: MaturityService) {}

    hasGoneThroughLanguageInspection = () => this.exam.languageInspection?.finishedAt;

    toggleEditorVisibility = () => (this.hideEditor = !this.hideEditor);

    saveInspectionStatement = () =>
        this.Maturity.saveInspectionStatement$(this.exam).subscribe((resp) => (this.exam.languageInspection = resp));

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
