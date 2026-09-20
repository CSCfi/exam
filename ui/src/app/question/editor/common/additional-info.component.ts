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
        const current = questionValue?.attachment;
        if (!questionValue || !current) {
            return;
        }
        if (current.id || current.externalId) {
            // Something exists on the server, so saving the question has to erase it. Drop any
            // pending replacement file as well, it must not get uploaded after all.
            const removed: Attachment = { ...current, file: undefined, modified: false, removed: true };
            questionValue.attachment = removed;
            this.attachment.set(removed);
        } else {
            // Never uploaded anywhere, so just forget the pick.
            delete questionValue.attachment;
            this.attachment.set(undefined);
        }
    }

    undoRemoveQuestionAttachment() {
        const questionValue = this.question();
        const current = this.attachment();
        if (!questionValue || !current?.removed) {
            return;
        }
        // Only a saved attachment can end up in the removed state, so clearing the flag is enough
        // to put it back as it is on the server.
        const restored: Attachment = { ...current, removed: false };
        questionValue.attachment = restored;
        this.attachment.set(restored);
    }

    getFileSize(): string {
        const a = this.attachment();
        return a ? this.Attachment.getFileSize(a.size) : '';
    }

    // A locally picked file is only sent to the server when the question itself is saved.
    hasPendingUpload(): boolean {
        return !!this.attachment()?.file;
    }

    // Replacing an existing attachment keeps the old id, so a pending file is never downloadable.
    isDownloadable(): boolean {
        const a = this.attachment();
        return !!(a && (a.id || a.externalId)) && !this.hasPendingUpload();
    }

    ngAfterViewInit() {
        // Add additional info form to parent form
        this.parentForm.form.addControl('additionalInfo', this.additionalInfoForm);
    }
}
