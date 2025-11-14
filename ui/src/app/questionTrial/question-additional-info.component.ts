// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { ControlContainer, FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { QuestionDraft, ReverseQuestion } from 'src/app/question/question.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';

@Component({
    selector: 'xm-question-additional-info-trial',
    standalone: true,
    templateUrl: './question-additional-info.component.html',
    viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
    imports: [ReactiveFormsModule, TranslateModule, NgbPopover, NgClass],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionAdditionalInfoTrialComponent implements AfterViewInit {
    question = input<ReverseQuestion | QuestionDraft>();
    showWarning = input(false);

    additionalInfoForm: FormGroup;
    private parentForm = inject(FormGroupDirective);
    private Attachment = inject(AttachmentService);

    constructor() {
        // Create form group for additional info
        this.additionalInfoForm = new FormGroup({
            instructions: new FormControl<string>(''),
            evaluationCriteria: new FormControl<string>(''),
        });

        // Sync form from question data when available
        effect(() => {
            const questionValue = this.question();
            if (questionValue && this.additionalInfoForm.pristine) {
                this.additionalInfoForm.patchValue(
                    {
                        instructions: questionValue.defaultAnswerInstructions || '',
                        evaluationCriteria: questionValue.defaultEvaluationCriteria || '',
                    },
                    { emitEvent: false },
                );
            }
        });
    }
    get showEvaluationCriteria(): boolean {
        return this.question()?.type === 'EssayQuestion';
    }

    selectFile() {
        this.Attachment.selectFile$(true).subscribe((data) => {
            const questionValue = this.question();
            if (questionValue) {
                questionValue.attachment = {
                    ...questionValue.attachment,
                    modified: true,
                    fileName: data.$value.attachmentFile.name,
                    size: data.$value.attachmentFile.size,
                    file: data.$value.attachmentFile,
                    removed: false,
                };
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
            this.Attachment.removeQuestionAttachment(questionValue);
        }
    }

    getFileSize(): string {
        const questionValue = this.question();
        if (questionValue?.attachment) {
            return this.Attachment.getFileSize(questionValue.attachment.size);
        }
        return '';
    }

    hasUploadedAttachment(): boolean {
        const questionValue = this.question();
        const a = questionValue?.attachment;
        return !!(a && (a.id || a.externalId));
    }

    ngAfterViewInit() {
        // Add additional info form to parent form
        this.parentForm.form.addControl('additionalInfo', this.additionalInfoForm);
    }
}
