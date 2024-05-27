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
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import type { ExamSectionQuestion, Question } from 'src/app/exam/exam.model';
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
