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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamSection, Question } from '../../exam/exam.model';
import { LibraryResultsComponent } from '../library/results/library-results.component';
import { LibrarySearchComponent } from '../library/search/library-search.component';

@Component({
    selector: 'xm-question-selector',
    standalone: true,
    imports: [TranslateModule, LibrarySearchComponent, LibraryResultsComponent],
    template: `
        <div id="dashboard">
            <!-- title row and add new question button -->
            <div class="modal-header">
                <div class="student-enroll-title-wrap">
                    <div class="student-enroll-title">{{ 'i18n_library_choose' | translate }}</div>
                </div>
            </div>
            <div class="modal-content pt-3">
                <!-- search bar and search parameters -->
                <xm-library-search (updated)="resultsUpdated($event)"></xm-library-search>

                <div class="row ms-3 mb-3">
                    <div class="col-md-12">
                        <div class="review-attachment-button make-inline mt-2">
                            <a class="pointer" (click)="addQuestions()"
                                >{{ 'i18n_add_chosen' | translate }} ( {{ selections.length }} )
                            </a>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-12">
                        <xm-library-results
                            [questions]="questions"
                            (selected)="questionSelected($event)"
                            (copied)="questionCopied()"
                            [disableLinks]="true"
                        ></xm-library-results>
                    </div>
                </div>

                <!-- Buttons -->
                <div class="modal-footer">
                    <div class="flex flex-middle me-2 mb-2">
                        <span class="float-end">
                            <div class="review-attachment-button make-inline">
                                <a class="pointer preview" (click)="cancel()">
                                    {{ 'i18n_button_cancel' | translate }}
                                </a>
                            </div>
                            <div class="review-attachment-button make-inline mt-2 me-3 ms-2">
                                <a class="pointer" (click)="addQuestions()">
                                    {{ 'i18n_add_chosen' | translate }} ( {{ selections.length }} )
                                </a>
                            </div>
                        </span>
                    </div>
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
    questionCopied = () => this.toast.info(this.translate.instant('i18n_question_copied'));
    cancel = () => this.modal.dismiss();

    addQuestions = () => {
        // check that at least one has been selected
        if (this.selections.length === 0) {
            this.toast.warning(this.translate.instant('i18n_choose_atleast_one'));
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
                        this.toast.info(this.translate.instant('i18n_question_added'));
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
