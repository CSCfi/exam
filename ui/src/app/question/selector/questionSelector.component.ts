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
import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamSection, Question } from '../../exam/exam.model';

@Component({
    selector: 'question-selector',
    templateUrl: './questionSelector.component.html',
})
export class QuestionSelectorComponent {
    @Input() questionCount = 0;
    @Input() sectionId = 0;
    @Input() examId = 0;
    questions: Question[] = [];
    selections: number[] = [];

    constructor(
        private modal: NgbActiveModal,
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
    ) {}

    resultsUpdated = (event: Question[]) => (this.questions = event);
    questionSelected = (event: number[]) => (this.selections = event);
    questionCopied = () => this.toast.info(this.translate.instant('sitnet_question_copied'));
    cancel = () => this.modal.dismiss();

    addQuestions = () => {
        // check that at least one has been selected
        if (this.selections.length === 0) {
            this.toast.warning(this.translate.instant('sitnet_choose_atleast_one'));
            return;
        }

        const insertQuestion = (sectionId: number, to: number, examId: number) => {
            this.http
                .post<ExamSection>(`/app/exams/${examId}/sections/${sectionId}/questions`, {
                    sequenceNumber: to,
                    questions: this.selections.join(),
                })
                .subscribe(
                    (resp) => {
                        const insertedSectionQuestions = resp.sectionQuestions.filter((esq) =>
                            this.selections.includes(esq.question.id),
                        );
                        this.toast.info(this.translate.instant('sitnet_question_added'));
                        this.modal.close(insertedSectionQuestions);
                    },
                    (err) => {
                        this.toast.error(err.data);
                        this.cancel();
                    },
                );
        };

        // calculate the new order number for question sequence
        // always add question to last spot, because dragndrop
        // is not in use here
        const to = this.questionCount + 1;
        insertQuestion(this.sectionId, to, this.examId);
    };
}
