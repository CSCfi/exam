// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ExamSectionQuestion, Question } from 'src/app/question/question.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ExamQuestionComponent } from './exam-question.component';

// This component is used for editing distributed exam questions.
@Component({
    selector: 'xm-exam-question-editor',
    standalone: true,
    imports: [ExamQuestionComponent],
    template: `
        @if (examQuestion) {
            <xm-exam-question
                [examQuestion]="examQuestion"
                (saved)="save($event)"
                (cancelled)="cancel($event)"
                [lotteryOn]="lotteryOn"
                autofocus
            ></xm-exam-question>
        }
    `,
})
export class ExamQuestionEditorComponent {
    @Input() examQuestion!: ExamSectionQuestion;
    @Input() lotteryOn = false;

    constructor(
        private modal: NgbActiveModal,
        private translate: TranslateService,
        private Dialogs: ConfirmationDialogService,
    ) {}

    save = (event: { question: Question; examQuestion: ExamSectionQuestion }) => this.modal.close(event);
    cancel = (event: { dirty: boolean }) => {
        if (event.dirty) {
            this.Dialogs.open$(
                this.translate.instant('i18n_confirm_exit'),
                this.translate.instant('i18n_unsaved_question_data'),
            ).subscribe(() => this.modal.dismiss());
        } else this.modal.dismiss();
    };
}
