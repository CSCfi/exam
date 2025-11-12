// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionReviewService } from 'src/app/review/questions/question-review.service';
import type { QuestionReview } from 'src/app/review/review.model';
import { SessionService } from 'src/app/session/session.service';
import { MathJaxDirective } from 'src/app/shared/math/mathjax.directive';

@Component({
    selector: 'xm-question-review',
    template: `<div class="xm-study-item-container mx-0">
        <div class="review-points-exam d-flex justify-content-between">
            @if (getAssessedAnswerCount() === review().answers.length) {
                <img src="/assets/images/icon_question_type_ready.png" />
            }
            @if (getAssessedAnswerCount() !== review().answers.length) {
                <img src="/assets/images/icon_question_type_ready_grey.png" />
            }

            <span class="ms-2">
                {{ getAssessedAnswerCount() }} / {{ review().answers.length }}
                {{ 'i18n_graded' | translate | lowercase }}
            </span>

            <span class="d-block float-end">
                <input
                    type="checkbox"
                    (change)="reviewSelected()"
                    class="questionToUpdate"
                    [(ngModel)]="review().selected"
                />
            </span>
        </div>
        <div class="review-points-exam">
            <strong>#{{ review().question.id }}</strong>
        </div>
        <!-- question points -->
        @if (review().question.defaultEvaluationType === 'Points') {
            <div class="review-points-exam">
                {{ review().question.defaultMaxScore }} {{ 'i18n_unit_points' | translate }}
            </div>
        }
        @if (review().question.defaultEvaluationType === 'Selection') {
            <div class="review-points-exam">
                {{ 'i18n_evaluation_select' | translate }}
            </div>
        }

        <!-- Question -->
        <div class="ms-2">
            <div [xmMathJax]="review().question.question"></div>
            @if (review().question.defaultAnswerInstructions) {
                <a (click)="toggleExpanded()" class="pointer-hand">
                    @if (!review().expanded) {
                        <img src="/assets/images/icon_list_show_right.svg" alt="" />
                    }
                    @if (review().expanded) {
                        <img src="/assets/images/icon_list_show_down.svg" alt="" />
                    }
                </a>
            }
        </div>

        @if (review().expanded) {
            @if (
                review().question.defaultAnswerInstructions &&
                (review().question.defaultAnswerInstructions?.length ?? 0) > 0
            ) {
                <img src="/assets/images/icon_info.png" alt="" />
                <span class="ps-2"> {{ review().question.defaultAnswerInstructions }}</span>
            }
        }
    </div>`,
    styleUrls: ['./question-review.component.scss'],
    imports: [FormsModule, MathJaxDirective, LowerCasePipe, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionReviewComponent {
    review = input.required<QuestionReview>();
    selected = output<{ id: number; selected: boolean }>();

    private QuestionReview = inject(QuestionReviewService);
    private Session = inject(SessionService);

    getAssessedAnswerCount() {
        return this.QuestionReview.getProcessedAnswerCount(this.review(), this.Session.getUser());
    }

    reviewSelected() {
        const currentReview = this.review();
        this.selected.emit({ id: currentReview.question.id, selected: currentReview.selected });
    }

    toggleExpanded() {
        const currentReview = this.review();
        currentReview.expanded = !currentReview.expanded;
    }
}
