// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, model } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { QuestionComponent } from 'src/app/question/editor/base/question.component';
import type { QuestionDraft, ReverseQuestion } from 'src/app/question/question.model';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';

@Component({
    imports: [QuestionComponent],
    template: `
        <div class="modal-body">
            <xm-question
                [question]="questionDraft()"
                [questionId]="questionId()"
                (saved)="onSave($event)"
                (cancelled)="cancel()"
                [collaborative]="collaborative()"
                [lotteryOn]="lotteryOn()"
                [examId]="examId()"
                [isPopup]="isPopup()"
                autofocus
            ></xm-question
            ><!-- [sectionQuestion]="sectionQuestion()" -->
        </div>
        <div class="modal-footer"></div>
    `,
})
export class BaseQuestionDialogComponent {
    // Model signals with defaults - this component is always opened as a modal
    questionDraft = model<ReverseQuestion | QuestionDraft | undefined>(undefined);
    questionId = model<number | undefined>(undefined);
    collaborative = model(false);
    lotteryOn = model(false);
    examId = model(0);
    sectionQuestion = model<ExamSectionQuestion | undefined>(undefined);
    isPopup = model(true); // Always true for modals

    private modal = inject(NgbActiveModal);
    private translate = inject(TranslateService);
    private Dialogs = inject(ConfirmationDialogService);

    onSave = (event: ReverseQuestion | QuestionDraft) => this.modal.close(event);
    cancel = () => {
        return this.Dialogs.open$(
            this.translate.instant('i18n_confirm_exit'),
            this.translate.instant('i18n_unsaved_question_data'),
        ).subscribe(() => this.modal.dismiss());
    };
}
