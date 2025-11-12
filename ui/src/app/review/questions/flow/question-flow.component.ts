// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionReviewService } from 'src/app/review/questions/question-review.service';
import type { QuestionReview } from 'src/app/review/review.model';
import { SessionService } from 'src/app/session/session.service';
import { QuestionFlowCategoryComponent } from './question-flow-category.component';

@Component({
    selector: 'xm-question-flow',
    template: `<div class="row mt-3">
            <div class="col-md-12 mb-3">
                <div class="question-flow-title">{{ 'i18n_question_flow' | translate }}</div>
            </div>
        </div>
        @if (unfinished().length > 0) {
            <xm-question-flow-category
                categoryTitle="i18n_in_progress"
                [reviews]="unfinished()"
                (selected)="questionSelected($event)"
            >
            </xm-question-flow-category>
        }
        @if (finished().length > 0) {
            <xm-question-flow-category
                categoryTitle="i18n_all_finished"
                [reviews]="finished()"
                [allDone]="true"
                (selected)="questionSelected($event)"
            >
            </xm-question-flow-category>
        }`,
    styleUrls: ['./question-flow.component.scss'],
    imports: [QuestionFlowCategoryComponent, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionFlowComponent {
    reviews = input<QuestionReview[]>([]);
    selected = output<number>();

    unfinished = computed(() => {
        const currentReviews = this.reviews();
        return currentReviews.filter((r) => this.getAssessedAnswerCount(r) < r.answers.length);
    });

    finished = computed(() => {
        const currentReviews = this.reviews();
        return currentReviews.filter((r) => this.getAssessedAnswerCount(r) === r.answers.length);
    });

    private QuestionReview = inject(QuestionReviewService);
    private Session = inject(SessionService);

    getAssessedAnswerCount(review: QuestionReview) {
        return this.QuestionReview.getProcessedAnswerCount(review, this.Session.getUser());
    }

    questionSelected(review: QuestionReview) {
        const allReviews = [...this.unfinished(), ...this.finished()];
        allReviews.forEach((r) => (r.selected = r.question.id === review.question.id));
        const currentReviews = this.reviews();
        this.selected.emit(currentReviews.indexOf(review));
    }
}
