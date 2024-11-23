// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import type { Examination, ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';
import { EssayAnswer } from 'src/app/question/question.model';
import type { AnsweredQuestion } from 'src/app/shared/attachment/attachment.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { CKEditorComponent } from 'src/app/shared/ckeditor/ckeditor.component';
import { FileService } from 'src/app/shared/file/file.service';

@Component({
    selector: 'xm-examination-essay-question',
    templateUrl: './examination-essay-question.component.html',
    imports: [FormsModule, TranslateModule, UpperCasePipe, DatePipe, CKEditorComponent],
    styleUrls: ['../examination.shared.scss', './question.shared.scss'],
})
export class ExaminationEssayQuestionComponent implements OnInit {
    @Input() sq!: Omit<ExaminationQuestion, 'essayAnswer'> & { essayAnswer: EssayAnswer };
    @Input() exam?: Examination;
    @Input() isPreview = false;

    questionTitle!: string;

    private Examination = inject(ExaminationService);
    private Attachment = inject(AttachmentService);
    private Files = inject(FileService);

    ngOnInit() {
        if (!this.sq.essayAnswer) {
            Object.assign(this.sq, { essayAnswer: {} });
        }
        this.Examination.setAnswerStatus(this.sq);
        const html = this.sq.question.question;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const decodedString = doc.documentElement.innerText;
        this.questionTitle = decodedString;
    }

    answerChanged = (event: string) => (this.sq.essayAnswer.answer = event);
    saveAnswer = () => this.Examination.saveTextualAnswer$(this.sq, this.exam?.hash || '', false, false).subscribe();

    removeQuestionAnswerAttachment = () => {
        const answeredQuestion = this.sq as AnsweredQuestion; // TODO: no casting
        if (this.exam?.external) {
            this.Attachment.removeExternalQuestionAnswerAttachment(answeredQuestion, this.exam.hash);
            return;
        }
        this.Attachment.removeQuestionAnswerAttachment(answeredQuestion);
    };

    selectFile = () => {
        if (this.isPreview || !this.exam) {
            return;
        }
        this.Attachment.selectFile(false).then((data) => {
            if (this.exam?.external) {
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
