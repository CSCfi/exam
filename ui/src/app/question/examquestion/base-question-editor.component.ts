// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { QuestionComponent } from 'src/app/question/basequestion/question.component';
import type { QuestionDraft } from 'src/app/question/question.model';
import { ExamSectionQuestion, Question } from 'src/app/question/question.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';

@Component({
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
