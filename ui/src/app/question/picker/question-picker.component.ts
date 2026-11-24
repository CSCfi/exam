// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Component, inject, model, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { ExamSection } from 'src/app/exam/exam.model';
import { LibraryResultsComponent } from 'src/app/question/library/results/library-results.component';
import { LibrarySearchComponent } from 'src/app/question/library/search/library-search.component';
import { LibraryQuestion } from 'src/app/question/question.model';
import { ToastService } from 'src/app/shared/toast/toast.service';

@Component({
    selector: 'xm-question-selector',
    imports: [TranslateModule, LibrarySearchComponent, LibraryResultsComponent],
    template: `
        <!-- title row and add new question button -->
        <div class="modal-header">
            <div class="xm-modal-title">{{ 'i18n_library_choose' | translate }}</div>
        </div>
        <div class="modal-body xm-stack">
            <!-- search bar and search parameters -->
            <div class="xm-stack xm-gap-2 picker-tools">
                <xm-library-search (updated)="resultsUpdated($event)"></xm-library-search>
                <div>
                    <button class="btn btn-success" (click)="addQuestions()">
                        {{ 'i18n_add_chosen' | translate }} ({{ selections().length }})
                    </button>
                </div>
            </div>

            <xm-library-results
                [questions]="questions()"
                (selected)="questionSelected($event)"
                (copied)="questionCopied()"
                (updated)="resultsUpdated($event)"
                [disableLinks]="true"
            ></xm-library-results>
        </div>

        <!-- Buttons -->
        <div class="xm-cluster picker-actions">
            <button class="btn btn-outline-secondary" (click)="cancel()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
            <button class="btn btn-success" (click)="addQuestions()">
                {{ 'i18n_add_chosen' | translate }} ({{ selections().length }})
            </button>
        </div>
    `,
    styles: `
        .picker-tools {
            padding-inline: 1.75rem;
        }
        .picker-actions {
            justify-content: flex-end;
            gap: var(--xm-space-3);
            margin: var(--xm-space-3);
        }
    `,
})
export class QuestionSelectorComponent {
    readonly questionCount = model(0);
    readonly sectionId = model(0);
    readonly examId = model(0);

    readonly questions = signal<LibraryQuestion[]>([]);
    readonly selections = signal<number[]>([]);

    private readonly modal = inject(NgbActiveModal);
    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastService);

    resultsUpdated = (event: LibraryQuestion[]) => this.questions.set(event);
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
