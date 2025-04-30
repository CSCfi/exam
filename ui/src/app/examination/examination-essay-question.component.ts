import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Attachment } from '@app/shared/attachment/attachment.model';
import { TranslateModule } from '@ngx-translate/core';
import { AttachmentService } from '@shared/attachment/attachment.service';

interface Answer {
    id?: string;
    text?: string;
    attachment?: Attachment;
    score?: number;
    feedback?: string;
    submittedAt?: Date;
    gradedAt?: Date;
}

@Component({
    selector: 'xm-examination-essay-question',
    templateUrl: './examination-essay-question.component.html',
    styleUrls: ['./examination-essay-question.component.scss'],
    standalone: true,
    imports: [FormsModule, TranslateModule],
})
export class ExaminationEssayQuestionComponent {
    @Input() answer!: Answer;
    @Output() answerChange = new EventEmitter<Answer>();

    constructor(private attachmentService: AttachmentService) {}

    selectFile(): void {
        this.attachmentService.selectFile$(false).subscribe({
            next: (data) => {
                if (data.$value.attachmentFile) {
                    this.answer.attachment = {
                        fileName: data.$value.attachmentFile.name,
                        size: data.$value.attachmentFile.size,
                        file: data.$value.attachmentFile,
                        removed: false,
                        modified: true,
                    };
                }
            },
        });
    }

    removeAttachment(): void {
        this.answer.attachment = undefined;
        this.answerChange.emit(this.answer);
    }
}
