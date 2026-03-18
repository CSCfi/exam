// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { combineLatestWith, filter, switchMap } from 'rxjs';
import { ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationQuestionComponent } from 'src/app/examination/question/examination-question.component';
import { Question } from 'src/app/question/question.model';

@Component({
    template: `
        <div class="modal-header">
            <h4 class="xm-modal-title">{{ 'i18n_preview_question' | translate }}</h4>
        </div>
        @if (preview()) {
            <div class="modal-body">
                <xm-examination-question
                    [question]="preview()!"
                    [isPreview]="true"
                    [isCollaborative]="false"
                ></xm-examination-question>
            </div>
        }
        <div class="modal-footer">
            <div class="xm-dialog-button-cancel">
                <button class="btn btn-success" (click)="activeModal.dismiss()">
                    {{ 'i18n_close' | translate }}
                </button>
            </div>
        </div>
    `,
    imports: [ExaminationQuestionComponent, TranslateModule],
})
export class QuestionPreviewDialogComponent {
    readonly question = signal<ExaminationQuestion | Question | undefined>(undefined);
    readonly isExamQuestion = signal(false);
    readonly preview = signal<ExaminationQuestion | undefined>(undefined);

    protected readonly activeModal = inject(NgbActiveModal);
    private readonly http = inject(HttpClient);

    constructor() {
        toObservable(this.question)
            .pipe(
                combineLatestWith(toObservable(this.isExamQuestion)),
                filter(([q]) => !!q?.id),
                switchMap(([q, isExam]) =>
                    this.http.get<ExaminationQuestion>(
                        `/app/questions/${q!.id}/preview/${isExam ? 'exam' : 'library'}`,
                    ),
                ),
                takeUntilDestroyed(),
            )
            .subscribe((res) => this.preview.set(res));
    }
}
