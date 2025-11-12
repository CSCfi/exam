// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { ExamSection } from 'src/app/exam/exam.model';
import { LibraryResultsComponent } from 'src/app/question/library/results/library-results.component';
import { LibrarySearchComponent } from 'src/app/question/library/search/library-search.component';
import { Question } from 'src/app/question/question.model';

@Component({
    selector: 'xm-question-selector',
    imports: [TranslateModule, LibrarySearchComponent, LibraryResultsComponent],
    template: `
        <!-- title row and add new question button -->
        <div class="modal-header">
            <div class="xm-modal-title">{{ 'i18n_library_choose' | translate }}</div>
        </div>
        <div class="modal-body pt-3">
            <!-- search bar and search parameters -->
            <xm-library-search (updated)="resultsUpdated($event)"></xm-library-search>

            <div class="row ms-3 mb-3">
                <div class="col-md-12">
                    <button class="btn btn-success" (click)="addQuestions()">
                        {{ 'i18n_add_chosen' | translate }} ({{ selections().length }})
                    </button>
                </div>
            </div>

            <div class="row">
                <div class="col-md-12">
                    <xm-library-results
                        [questions]="questions()"
                        (selected)="questionSelected($event)"
                        (copied)="questionCopied()"
                        [disableLinks]="true"
                    ></xm-library-results>
                </div>
            </div>
        </div>

        <!-- Buttons -->
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-success" (click)="addQuestions()">
                {{ 'i18n_add_chosen' | translate }} ({{ selections().length }})
            </button>
            <button class="btn btn-outline-secondary me-3" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
})
export class QuestionSelectorComponent {
    questionCount = input(0);
    sectionId = input(0);
    examId = input(0);
    questions = signal<Question[]>([]);
    selections = signal<number[]>([]);

    private modal = inject(NgbActiveModal);
    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);

    resultsUpdated = (event: Question[]) => this.questions.set(event);
    questionSelected = (event: number[]) => this.selections.set(event);
    questionCopied = () => this.toast.info(this.translate.instant('i18n_question_copied'));
    cancel = () => this.modal.dismiss();

    addQuestions = () => {
        const selectionsValue = this.selections();
        // check that at least one has been selected
        if (selectionsValue.length === 0) {
            this.toast.warning(this.translate.instant('i18n_choose_atleast_one'));
            return;
        }

        const insertQuestion = (sectionId: number, to: number, examId: number) => {
            this.http
                .post<ExamSection>(`/app/exams/${examId}/sections/${sectionId}/questions`, {
                    sequenceNumber: to,
                    questions: selectionsValue.join(),
                })
                .subscribe({
                    next: (resp) => {
                        const insertedSectionQuestions = resp.sectionQuestions.filter((esq) =>
                            selectionsValue.includes(esq.question.id),
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
        const to = this.questionCount() + 1;
        insertQuestion(this.sectionId(), to, this.examId());
    };
}
