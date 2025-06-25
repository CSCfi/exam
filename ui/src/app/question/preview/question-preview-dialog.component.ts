// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationQuestionComponent } from 'src/app/examination/question/examination-question.component';
import { Question } from 'src/app/question/question.model';

@Component({
    template: `
        <div class="modal-header">
            <h4 class="xm-modal-title">{{ 'i18n_preview_question' | translate }}</h4>
        </div>
        @if (preview) {
            <div class="modal-body">
                <xm-examination-question
                    [question]="preview"
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
export class QuestionPreviewDialogComponent implements OnInit {
    @Input() question!: ExaminationQuestion | Question;
    @Input() isExamQuestion = false;

    preview?: ExaminationQuestion;

    constructor(
        public activeModal: NgbActiveModal,
        private http: HttpClient,
    ) {}

    ngOnInit() {
        const urlSuffix = this.isExamQuestion ? 'exam' : 'library';
        const id = this.question.id;
        this.http.get<ExaminationQuestion>(`/app/questions/${id}/preview/${urlSuffix}`).subscribe({
            next: (res) => (this.preview = res),
        });
    }
}
