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
    selector: 'xm-question-selector',
    template: `
        <div id="library">
            <!-- title row and add new question button -->
            <div class="modal-header">
                <div class="student-enroll-title-wrap">
                    <div class="student-enroll-title">{{ 'sitnet_library_choose' | translate }}</div>
                </div>
            </div>
            <div class="modal-content">
                <!-- search bar and search parameters -->
                <xm-library-search (updated)="resultsUpdated($event)"></xm-library-search>

                <div class="row">
                    <div class="col-md-12 padl0 padr0 marb20">
                        <span class="float-start marl20">
                            <div class="library-button make-inline mart20 marr30 marl10">
                                <a class="pointer" (click)="addQuestions()"
                                    >{{ 'sitnet_add_chosen' | translate }} ( {{ selections.length }} )
                                </a>
                            </div>
                        </span>
                    </div>
                </div>

                <!-- resulting table with questions -->
                <xm-library-results
                    [questions]="questions"
                    (selected)="questionSelected($event)"
                    (copied)="questionCopied()"
                    tableClass="library-table"
                    [disableLinks]="true"
                    class="overflow-x-auto"
                ></xm-library-results>
            </div>

            <!-- Buttons -->
            <div class="modal-footer">
                <div class="flex flex-middle marr20 marb20">
                    <span class="float-end">
                        <div class="library-button make-inline">
                            <a class="pointer preview" (click)="cancel()">
                                {{ 'sitnet_button_cancel' | translate }}
                            </a>
                        </div>
                        <div class="library-button make-inline mart20 marr30 marl10">
                            <a class="pointer" (click)="addQuestions()">
                                {{ 'sitnet_add_chosen' | translate }} ( {{ selections.length }} )
                            </a>
                        </div>
                    </span>
                </div>
            </div>
        </div>
    `,
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
                .subscribe({
                    next: (resp) => {
                        const insertedSectionQuestions = resp.sectionQuestions.filter((esq) =>
                            this.selections.includes(esq.question.id),
                        );
                        this.toast.info(this.translate.instant('sitnet_question_added'));
                        this.modal.close(insertedSectionQuestions);
                    },
                    error: (err) => {
                        this.toast.error(err);
                        this.cancel();
                    },
                });
        };

        // calculate the new order number for question sequence
        // always add question to last spot, because dragndrop
        // is not in use here
        const to = this.questionCount + 1;
        insertQuestion(this.sectionId, to, this.examId);
    };
}
