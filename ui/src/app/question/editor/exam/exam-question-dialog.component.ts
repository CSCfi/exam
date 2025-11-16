// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, model, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ExamSectionQuestion, Question } from 'src/app/question/question.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ExamQuestionComponent } from './exam-question.component';

// This component is used for editing distributed exam questions.
@Component({
    imports: [ExamQuestionComponent, TranslateModule],
    template: `
        <div class="modal-header">
            <span class="xm-modal-title">{{ 'i18n_questions_edit' | translate }}</span>
        </div>
        <div class="modal-body">
            <xm-exam-question
                #examQuestionComponent
                [(examQuestion)]="examQuestion"
                (saved)="save($event)"
                (cancelled)="cancel($event)"
                [lotteryOn]="lotteryOn()"
                autofocus
            ></xm-exam-question>
        </div>
        <div class="modal-footer">
            <button
                [disabled]="
                    examQuestionComponent.questionForm.invalid ||
                    examQuestionComponent.hasInvalidClaimChoiceOptions() ||
                    !examQuestionComponent.adaptedQuestion()?.question
                "
                (click)="examQuestionComponent.save()"
                type="button"
                class="btn btn-success"
            >
                {{ 'i18n_save' | translate }}
            </button>
            <button (click)="examQuestionComponent.cancel()" type="button" class="btn btn-outline-secondary me-3">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
})
export class ExamQuestionDialogComponent {
    @ViewChild('examQuestionComponent') examQuestionComponent?: ExamQuestionComponent;
    examQuestion = model<ExamSectionQuestion | undefined>(undefined);
    lotteryOn = model(false);

    private modal = inject(NgbActiveModal);
    private translate = inject(TranslateService);
    private Dialogs = inject(ConfirmationDialogService);

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
