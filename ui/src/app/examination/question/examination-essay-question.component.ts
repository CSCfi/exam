// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExaminationEssayQuestionComponent {
    sq = input.required<Omit<ExaminationQuestion, 'essayAnswer'> & { essayAnswer: EssayAnswer }>();
    exam = input<Examination | undefined>(undefined);
    isPreview = input(false);

    questionTitle = computed(() => {
        const html = this.sq().question.question;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.documentElement.innerText;
    });

    private Examination = inject(ExaminationService);
    private Attachment = inject(AttachmentService);
    private Files = inject(FileService);

    constructor() {
        // Initialize essayAnswer if missing and set answer status when sq input changes
        effect(() => {
            const currentSq = this.sq();
            if (!currentSq.essayAnswer) {
                Object.assign(currentSq, { essayAnswer: {} });
            }
            this.Examination.setAnswerStatus(currentSq);
        });
    }

    answerChanged(event: string) {
        this.sq().essayAnswer.answer = event;
    }

    saveAnswer() {
        this.Examination.saveTextualAnswer$(this.sq(), this.exam()?.hash || '', false, false).subscribe();
    }

    removeQuestionAnswerAttachment() {
        const answeredQuestion = this.sq() as AnsweredQuestion; // TODO: no casting
        const currentExam = this.exam();
        if (currentExam?.external) {
            this.Attachment.removeExternalQuestionAnswerAttachment(answeredQuestion, currentExam.hash);
            return;
        }
        this.Attachment.removeQuestionAnswerAttachment(answeredQuestion);
    }

    selectFile() {
        const currentExam = this.exam();
        if (this.isPreview() || !currentExam) {
            return;
        }
        this.Attachment.selectFile$(false).subscribe((data) => {
            const currentSq = this.sq();
            if (currentExam?.external) {
                this.Files.uploadAnswerAttachment(
                    '/app/iop/attachment/question/answer',
                    data.$value.attachmentFile,
                    { questionId: currentSq.id.toString(), examId: currentExam.hash },
                    currentSq.essayAnswer,
                );
                return;
            }
            const params = { questionId: currentSq.id.toString() };
            this.Files.uploadAnswerAttachment(
                '/app/attachment/question/answer',
                data.$value.attachmentFile,
                currentSq.essayAnswer.id ? { ...params, answerId: currentSq.essayAnswer.id.toString() } : params,
                currentSq.essayAnswer,
            );
        });
    }
}
