// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { AfterViewInit, ChangeDetectionStrategy, Component, inject, input, linkedSignal, OnInit } from '@angular/core';
import { ControlContainer, FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { QuestionDraft, ReverseQuestion } from 'src/app/question/question.model';
import type { Attachment } from 'src/app/shared/attachment/attachment.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';

@Component({
    selector: 'xm-question-additional-info',
    templateUrl: './additional-info.component.html',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, TranslateModule, NgbPopover],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdditionalInfoComponent implements OnInit, AfterViewInit {
    readonly question = input<ReverseQuestion | QuestionDraft>();
    readonly questionType = input<string | null>(null);
    readonly showWarning = input(false);

    readonly additionalInfoForm: FormGroup;
    readonly attachment = linkedSignal<Attachment | undefined>(() => this.question()?.attachment);

    private readonly parentForm = inject(FormGroupDirective);
    private readonly Attachment = inject(AttachmentService);

    constructor() {
        this.additionalInfoForm = new FormGroup({
            instructions: new FormControl<string>(''),
            evaluationCriteria: new FormControl<string>(''),
        });
    }

    get showEvaluationCriteria(): boolean {
        return (this.questionType() ?? this.question()?.type) === 'EssayQuestion';
    }

    ngOnInit() {
        const questionValue = this.question();
        if (questionValue) {
            this.additionalInfoForm.patchValue(
                {
                    instructions: questionValue.defaultAnswerInstructions || '',
                    evaluationCriteria: questionValue.defaultEvaluationCriteria || '',
                },
                { emitEvent: false },
            );
        }
    }

    selectFile() {
        this.Attachment.selectFile$(true).subscribe((data) => {
            const questionValue = this.question();
            if (questionValue) {
                const newAttachment: Attachment = {
                    ...questionValue.attachment,
                    modified: true,
                    fileName: data.$value.attachmentFile.name,
                    size: data.$value.attachmentFile.size,
                    file: data.$value.attachmentFile,
                    removed: false,
                };
                questionValue.attachment = newAttachment;
                this.attachment.set(newAttachment);
            }
        });
    }

    downloadQuestionAttachment() {
        const questionValue = this.question();
        if (questionValue) {
            this.Attachment.downloadQuestionAttachment(questionValue);
        }
    }

    removeQuestionAttachment() {
        const questionValue = this.question();
        if (questionValue?.attachment) {
            questionValue.attachment.removed = true;
            this.attachment.update((a) => (a ? { ...a, removed: true } : undefined));
        }
    }

    getFileSize(): string {
        const a = this.attachment();
        return a ? this.Attachment.getFileSize(a.size) : '';
    }

    hasUploadedAttachment(): boolean {
        const a = this.attachment();
        return !!(a && (a.id || a.externalId));
    }

    ngAfterViewInit() {
        // Add additional info form to parent form
        this.parentForm.form.addControl('additionalInfo', this.additionalInfoForm);
    }
}
