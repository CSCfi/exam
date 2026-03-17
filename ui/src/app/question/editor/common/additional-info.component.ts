// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    input,
    OnInit,
} from '@angular/core';
import { ControlContainer, FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { QuestionDraft, ReverseQuestion } from 'src/app/question/question.model';
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
    readonly showWarning = input(false);

    readonly additionalInfoForm: FormGroup;

    private readonly parentForm = inject(FormGroupDirective);
    private readonly Attachment = inject(AttachmentService);
    private readonly cdr = inject(ChangeDetectorRef);

    constructor() {
        this.additionalInfoForm = new FormGroup({
            instructions: new FormControl<string>(''),
            evaluationCriteria: new FormControl<string>(''),
        });
    }

    get showEvaluationCriteria(): boolean {
        return this.question()?.type === 'EssayQuestion';
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
                questionValue.attachment = {
                    ...questionValue.attachment,
                    modified: true,
                    fileName: data.$value.attachmentFile.name,
                    size: data.$value.attachmentFile.size,
                    file: data.$value.attachmentFile,
                    removed: false,
                };
                this.cdr.markForCheck();
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
