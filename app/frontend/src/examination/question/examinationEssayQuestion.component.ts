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
import { FileService } from '../../utility/file/file.service';
import { Examination, ExaminationQuestion, ExaminationService } from '../examination.service';

@Component({
    selector: 'examination-essay-question',
    template: require('./examinationEssayQuestion.component.html'),
})
export class ExaminationEssayQuestionComponent {
    @Input() sq: ExaminationQuestion;
    @Input() exam: Examination;
    @Input() isPreview: boolean;
    constructor(
        private Examination: ExaminationService,
        private Attachment: AttachmentService,
        private Files: FileService,
    ) {}

    ngOnInit = () => this.Examination.setQuestionColors(this.sq);
    saveAnswer = () => this.Examination.saveTextualAnswer(this.sq, this.exam.hash, false, false);
    removeQuestionAnswerAttachment = () => {
        if (!this.sq.essayAnswer) return;
        const answeredQuestion = { id: this.sq.essayAnswer.id, essayAnswer: this.sq.essayAnswer };
        if (this.exam.external) {
            this.Attachment.removeExternalQuestionAnswerAttachment(answeredQuestion, this.exam.hash);
            return;
        }
        this.Attachment.removeQuestionAnswerAttachment(answeredQuestion);
    };

    selectFile = () => {
        if (this.isPreview) {
            return;
        }
        this.Attachment.selectFile(false).then(data => {
            if (this.exam.external) {
                this.Files.uploadAnswerAttachment(
                    '/app/iop/attachment/question/answer',
                    data.$value.attachmentFile,
                    { questionId: this.sq.id, examId: this.exam.hash },
                    this.sq.essayAnswer,
                );
                return;
            }
            this.Files.uploadAnswerAttachment(
                '/app/attachment/question/answer',
                data.$value.attachmentFile,
                { questionId: this.sq.id, answerId: this.sq.essayAnswer?.id },
                this.sq.essayAnswer,
            );
        });
    };
}
