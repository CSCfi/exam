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
import { QuestionComponent } from 'src/app/question/basequestion/question.component';
import type { QuestionDraft } from 'src/app/question/question.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';

@Component({
    selector: 'xm-base-question-editor',
    standalone: true,
    imports: [QuestionComponent],
    template: `
        <div class="modal-body">
            <xm-question
                [newQuestion]="newQuestion"
                [questionId]="questionId"
                (saved)="onSave($event)"
                (cancelled)="cancel()"
                [questionDraft]="questionDraft"
                [collaborative]="collaborative"
                [lotteryOn]="lotteryOn"
                [examId]="examId"
                [sectionQuestion]="sectionQuestion"
                [isPopup]="isPopup"
                autofocus
            ></xm-question>
        </div>
        <div class="modal-footer"></div>
    `,
})
export class BaseQuestionEditorComponent {
    @Input() newQuestion = false;
    @Input() questionDraft!: Question;
    @Input() questionId = 0;
    @Input() collaborative = false;
    @Input() lotteryOn = false;
    @Input() examId = 0;
    @Input() sectionQuestion!: ExamSectionQuestion;
    @Input() isPopup = false;

    constructor(
        public modal: NgbActiveModal,
        private translate: TranslateService,
        private Dialogs: ConfirmationDialogService,
    ) {}

    onSave = (event: Question | QuestionDraft) => this.modal.close(event);
    cancel = () => {
        return this.Dialogs.open$(
            this.translate.instant('i18n_confirm_exit'),
            this.translate.instant('i18n_unsaved_question_data'),
        ).subscribe(() => this.modal.dismiss());
    };
}
