// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, UpperCasePipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    input,
    linkedSignal,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Examination, ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';
import { EssayAnswer } from 'src/app/question/question.model';
import type { AnsweredQuestion, Attachment } from 'src/app/shared/attachment/attachment.model';
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
    readonly sq = input.required<Omit<ExaminationQuestion, 'essayAnswer'> & { essayAnswer: EssayAnswer }>();
    readonly exam = input<Examination | undefined>(undefined);
    readonly isPreview = input(false);

    readonly questionTitle = computed(() => {
        const html = this.sq().question.question;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.documentElement.innerText;
    });

    readonly autosaved = signal<Date | undefined>(undefined);
    readonly attachment = linkedSignal<Attachment | undefined>(() => this.sq().essayAnswer?.attachment);

    private readonly Examination = inject(ExaminationService);
    private readonly Attachment = inject(AttachmentService);
    private readonly Files = inject(FileService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly toast = inject(ToastrService);
    private readonly translate = inject(TranslateService);

    constructor() {
        toObservable(this.sq)
            .pipe(takeUntilDestroyed())
            .subscribe((sq) => {
                if (!sq.essayAnswer) {
                    Object.assign(sq, { essayAnswer: {} });
                }
                this.Examination.setAnswerStatus(sq);
            });

        const autosaveInterval = window.setInterval(() => {
            const sq = this.sq();
            if (this.isPreview() || !sq.essayAnswer?.answer) return;
            this.Examination.saveTextualAnswer$(sq, this.exam()?.hash ?? '', {
                autosave: true,
                canFail: true,
                external: this.exam()?.external ?? false,
            }).subscribe({ next: () => this.autosaved.set(new Date()) });
        }, 60 * 1000);
        this.destroyRef.onDestroy(() => window.clearInterval(autosaveInterval));
    }

    answerChanged(event: string) {
        const sq = this.sq();
        sq.essayAnswer.answer = event;
        this.Examination.setAnswerStatus(sq);
    }

    saveAnswer() {
        this.Examination.saveTextualAnswer$(this.sq(), this.exam()?.hash || '', {
            autosave: false,
            canFail: false,
            external: this.exam()?.external ?? false,
        }).subscribe();
    }

    removeQuestionAnswerAttachment() {
        const answeredQuestion = this.sq() as AnsweredQuestion; // TODO: no casting
        const currentExam = this.exam();
        const removal$ = currentExam?.external
            ? this.Attachment.removeExternalQuestionAnswerAttachment(answeredQuestion, currentExam.hash)
            : this.Attachment.removeQuestionAnswerAttachment(answeredQuestion);
        removal$.subscribe({ next: () => this.attachment.set(undefined) });
    }

    selectFile() {
        const currentExam = this.exam();
        if (this.isPreview() || !currentExam) {
            return;
        }
        this.Attachment.selectFile$(false).subscribe((data) => {
            const currentSq = this.sq();
            const essayAnswer = currentSq.essayAnswer;
            const url = currentExam.external
                ? '/app/iop/attachment/question/answer'
                : '/app/attachment/question/answer';
            const baseParams = { questionId: currentSq.id.toString() };
            const params = currentExam.external
                ? { ...baseParams, examId: currentExam.hash }
                : essayAnswer.id
                  ? { ...baseParams, answerId: essayAnswer.id.toString() }
                  : baseParams;

            this.Files.upload$<EssayAnswer | Attachment>(url, data.$value.attachmentFile, params).subscribe({
                next: (resp) => {
                    if ('fileName' in resp) {
                        essayAnswer.attachment = resp;
                        this.attachment.set(resp);
                    } else {
                        essayAnswer.id = resp.id;
                        essayAnswer.objectVersion = resp.objectVersion;
                        essayAnswer.attachment = resp.attachment;
                        this.attachment.set(resp.attachment);
                    }
                },
                error: (resp) => {
                    const msg = resp?.error?.data;
                    if (msg) this.toast.error(this.translate.instant(msg));
                },
            });
        });
    }
}
