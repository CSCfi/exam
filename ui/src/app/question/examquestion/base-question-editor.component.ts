// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, model } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { QuestionComponent } from 'src/app/question/basequestion/question.component';
import type { QuestionDraft } from 'src/app/question/question.model';
import { ExamSectionQuestion, Question } from 'src/app/question/question.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';

@Component({
    imports: [QuestionComponent],
    template: `
        <div class="modal-body">
            <xm-question
                [newQuestionInput]="newQuestion()"
                [questionId]="questionId()"
                (saved)="onSave($event)"
                (cancelled)="cancel()"
                [questionDraft]="questionDraft()"
                [collaborative]="collaborative()"
                [lotteryOn]="lotteryOn()"
                [examId]="examId()"
                [sectionQuestion]="sectionQuestion()"
                [isPopup]="isPopup()"
                autofocus
            ></xm-question>
        </div>
        <div class="modal-footer"></div>
    `,
})
export class BaseQuestionEditorComponent {
    newQuestion = model(false);
    questionDraft = model.required<Question>();
    questionId = model(0);
    collaborative = model(false);
    lotteryOn = model(false);
    examId = model(0);
    sectionQuestion = model.required<ExamSectionQuestion>();
    isPopup = model(false);

    private modal = inject(NgbActiveModal);
    private translate = inject(TranslateService);
    private Dialogs = inject(ConfirmationDialogService);

    onSave = (event: Question | QuestionDraft) => this.modal.close(event);
    cancel = () => {
        return this.Dialogs.open$(
            this.translate.instant('i18n_confirm_exit'),
            this.translate.instant('i18n_unsaved_question_data'),
        ).subscribe(() => this.modal.dismiss());
    };
}
