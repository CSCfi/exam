// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import { QuestionReviewService } from 'src/app/review/questions/question-review.service';
import type { QuestionReview } from 'src/app/review/review.model';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { QuestionReviewComponent } from './question-review.component';

@Component({
    selector: 'xm-question-reviews',
    template: `<div class="question-reviews">
        <div class="question-reviews-info">
            <img class="me-3" src="/assets/images/icon_info.png" alt="" />
            <strong>{{ 'i18n_question_review_info' | translate }}</strong>
            {{ 'i18n_question_review_info_detailed' | translate }}
        </div>

        @if (reviews().length === 0) {
            <h3 class="question-reviews-empty">{{ 'i18n_no_questions_to_review' | translate }}</h3>
        }
        @if (reviews().length > 0) {
            <div class="question-reviews-toolbar">
                <strong class="question-review-toolbar-text"
                    >{{ selectedReviews().length }} {{ 'i18n_questions_selected' | translate }}</strong
                >
                <button [disabled]="selectedReviews().length === 0" class="btn btn-success" (click)="startReview()">
                    {{ 'i18n_review_selected' | translate }} ({{ selectedReviews().length }})
                </button>
            </div>
            <div class="question-reviews-toolbar question-reviews-select">
                <span class="question-review-title">{{ 'i18n_select_question_reviews' | translate }}</span>
                <span>
                    <label class="me-2" for="select-all">{{ 'i18n_check_uncheck_all' | translate }}</label>
                    <input
                        id="select-all"
                        type="checkbox"
                        [checked]="selectionToggle()"
                        (change)="onSelectionToggleChange($event)"
                    />
                </span>
            </div>
            @for (review of reviews(); track review) {
                <xm-question-review [review]="review" (selected)="onReviewSelection($event)"> </xm-question-review>
            }
            <div class="question-reviews-toolbar">
                <strong class="question-review-toolbar-text"
                    >{{ selectedReviews().length }} {{ 'i18n_questions_selected' | translate }}</strong
                >
                <button [disabled]="selectedReviews().length === 0" class="btn btn-success" (click)="startReview()">
                    {{ 'i18n_review_selected' | translate }} ({{ selectedReviews().length }})
                </button>
            </div>
        }
    </div>`,
    styleUrls: ['../assessment/question-assessment.component.scss'],
    imports: [QuestionReviewComponent, TranslateModule],
})
export class QuestionReviewsComponent {
    readonly examId = signal(0);
    readonly reviews = signal<QuestionReview[]>([]);
    readonly selectedReviews = signal<number[]>([]);
    readonly selectionToggle = signal(false);

    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);
    private readonly QuestionReview = inject(QuestionReviewService);
    private readonly Tabs = inject(ExamTabService);

    constructor() {
        this.examId.set(this.Tabs.getExam().id);
        this.QuestionReview.getReviews$(this.examId()).subscribe({
            next: (resp) => this.reviews.set(resp),
            error: (err) => this.toast.error(err),
        });
        this.Tabs.notifyTabChange(6);
    }

    onReviewSelection(event: { id: number; selected: boolean }) {
        const currentSelected = this.selectedReviews();
        const index = currentSelected.indexOf(event.id);
        if (event.selected && index === -1) {
            this.selectedReviews.set([...currentSelected, event.id]);
        } else if (index > -1) {
            this.selectedReviews.set(currentSelected.filter((id) => id !== event.id));
        }
    }

    removeSelections() {
        const currentReviews = this.reviews();
        currentReviews.forEach((r) => (r.selected = false));
        this.selectedReviews.set([]);
    }

    addSelections() {
        const currentReviews = this.reviews();
        currentReviews.forEach((r) => (r.selected = true));
        this.selectedReviews.set(currentReviews.map((r) => r.question.id));
    }

    onSelectionToggleChange = (event: Event) => {
        this.setSelectionToggle((event.target as HTMLInputElement).checked);
        this.selectAll();
    };

    selectAll() {
        if (this.selectionToggle()) {
            this.addSelections();
        } else {
            this.removeSelections();
        }
    }

    setSelectionToggle(value: boolean) {
        this.selectionToggle.set(value);
    }

    startReview() {
        this.router.navigate(['/staff/assessments', this.examId(), 'questions'], {
            queryParams: { q: this.selectedReviews() },
        });
    }
}
