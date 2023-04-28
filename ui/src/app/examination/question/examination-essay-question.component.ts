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
import { Component, Input, OnInit } from '@angular/core';
import type { EssayAnswer } from '../../exam/exam.model';
import type { AnsweredQuestion } from '../../shared/attachment/attachment.service';
import { AttachmentService } from '../../shared/attachment/attachment.service';
import { FileService } from '../../shared/file/file.service';
import type { Examination, ExaminationQuestion } from '../examination.model';
import { ExaminationService } from '../examination.service';

@Component({
    selector: 'xm-examination-essay-question',
    templateUrl: './examination-essay-question.component.html',
})
export class ExaminationEssayQuestionComponent implements OnInit {
    @Input() sq!: Omit<ExaminationQuestion, 'essayAnswer'> & { essayAnswer: EssayAnswer };
    @Input() exam!: Examination;
    @Input() isPreview = false;

    questionTitle!: string;

    constructor(
        private Examination: ExaminationService,
        private Attachment: AttachmentService,
        private Files: FileService,
    ) {}

    ngOnInit() {
        if (!this.sq.essayAnswer) {
            Object.assign(this.sq, { essayAnswer: {} });
        }
        this.Examination.setQuestionColors(this.sq);
        const html = this.sq.question.question;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const decodedString = doc.documentElement.innerText;
        this.questionTitle = decodedString;
    }
    saveAnswer = () => this.Examination.saveTextualAnswer$(this.sq, this.exam.hash, false, false).subscribe();
    removeQuestionAnswerAttachment = () => {
        const answeredQuestion = this.sq as AnsweredQuestion; // TODO: no casting
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
        this.Attachment.selectFile(false).then((data) => {
            if (this.exam.external) {
                this.Files.uploadAnswerAttachment(
                    '/app/iop/attachment/question/answer',
                    data.$value.attachmentFile,
                    { questionId: this.sq.id.toString(), examId: this.exam.hash },
                    this.sq.essayAnswer,
                );
                return;
            }
            const params = { questionId: this.sq.id.toString() };
            this.Files.uploadAnswerAttachment(
                '/app/attachment/question/answer',
                data.$value.attachmentFile,
                this.sq.essayAnswer.id ? { ...params, answerId: this.sq.essayAnswer.id.toString() } : params,
                this.sq.essayAnswer,
            );
        });
    };
}
