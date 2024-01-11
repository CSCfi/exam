/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */

import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Question } from 'src/app/exam/exam.model';
import { ExaminationQuestionComponent } from 'src/app/examination/question/examination-question.component';
import { ExaminationQuestion } from '../../examination/examination.model';

@Component({
    template: `
        <div class="modal-header" aria-modal="true">
            <h4 class="modal-title">{{ 'i18n_preview_question' | translate }}</h4>
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
            <div class="student-message-dialog-button-cancel">
                <button class="btn btn-success" (click)="activeModal.dismiss()">
                    {{ 'i18n_close' | translate }}
                </button>
            </div>
        </div>
    `,
    standalone: true,
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
