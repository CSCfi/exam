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

import { AttachmentService } from '../../utility/attachment/attachment.service';
import { SanitizedHtmlPipe } from '../../utility/html/sanitizedHtml.pipe';
import { TruncatingPipe } from '../../utility/truncate/truncate.pipe';
import { Examination, ExaminationQuestion, ExaminationService } from '../examination.service';

@Component({
    selector: 'examination-question',
    template: require('./examinationQuestion.component.html'),
})
export class ExaminationQuestionComponent {
    @Input() exam: Examination;
    @Input() sq: ExaminationQuestion;
    @Input() isPreview: boolean;
    @Input() isCollaborative: boolean;

    constructor(
        private Truncate: TruncatingPipe,
        private safeHtml: SanitizedHtmlPipe,
        private Examination: ExaminationService,
        private Attachment: AttachmentService,
    ) {}

    ngOnInit() {
        this.sq.expanded = true;
        const answerData = this.sq.clozeTestAnswer;
        if (answerData && typeof answerData.answer === 'string') {
            answerData.answer = JSON.parse(answerData.answer);
        }
    }

    displayQuestionText = (truncated: boolean) => {
        const text = truncated ? this.Truncate.transform(this.sq.question.question, 240) : this.sq.question.question;
        return this.safeHtml.transform(text);
    };

    downloadQuestionAttachment = () => {
        if (this.exam.external) {
            this.Attachment.downloadExternalQuestionAttachment(this.exam, this.sq);
        } else if (this.isCollaborative) {
            this.Attachment.downloadCollaborativeQuestionAttachment(this.exam.id, this.sq);
        } else {
            this.Attachment.downloadQuestionAttachment(this.sq.question);
        }
    };

    isAnswered = () => this.Examination.isAnswered(this.sq);
}
