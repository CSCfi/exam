// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { LowerCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionReviewService } from 'src/app/review/questions/question-review.service';
import type { QuestionReview } from 'src/app/review/review.model';
import { SessionService } from 'src/app/session/session.service';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';

@Component({
    selector: 'xm-question-review',
    template: `<div class="xm-study-item-container mx-0">
        <div class="review-points-exam d-flex justify-content-between">
            <div>
                @if (getAssessedAnswerCount() === review.answers.length) {
                    <img src="/assets/images/icon_question_type_ready.png" />
                }
                @if (getAssessedAnswerCount() !== review.answers.length) {
                    <img src="/assets/images/icon_question_type_ready_grey.png" />
                }

                <span class="ms-2">
                    {{ getAssessedAnswerCount() }} / {{ review.answers.length }}
                    {{ 'i18n_graded' | translate | lowercase }}
                </span>
            </div>
            <span class="float-end">
                <input
                    type="checkbox"
                    (change)="reviewSelected()"
                    class="questionToUpdate"
                    [(ngModel)]="review.selected"
                />
            </span>
        </div>
        <div class="review-points-exam">
            <strong>#{{ review.question.id }}</strong>
        </div>
        <!-- question points -->
        @if (review.question.defaultEvaluationType === 'Points') {
            <div class="review-points-exam">
                {{ review.question.defaultMaxScore }} {{ 'i18n_unit_points' | translate }}
            </div>
        }
        @if (review.question.defaultEvaluationType === 'Selection') {
            <div class="review-points-exam">
                {{ 'i18n_evaluation_select' | translate }}
            </div>
        }

        <!-- Question -->
        <div class="ms-2">
            <div [xmMathJax]="review.question.question"></div>
            @if (review.question.defaultAnswerInstructions) {
                <a (click)="review.expanded = !review.expanded" class="pointer-hand">
                    @if (!review.expanded) {
                        <img src="/assets/images/icon_list_show_right.svg" alt="" />
                    }
                    @if (review.expanded) {
                        <img src="/assets/images/icon_list_show_down.svg" alt="" />
                    }
                </a>
            }
        </div>

        @if (review.expanded) {
            <div>
                @if (
                    review.question.defaultAnswerInstructions && review.question.defaultAnswerInstructions.length > 0
                ) {
                    <img src="/assets/images/icon_info.png" alt="" />
                }
                @if (
                    review.question.defaultAnswerInstructions && review.question.defaultAnswerInstructions.length > 0
                ) {
                    <span class="ps-2"> {{ review.question.defaultAnswerInstructions }}</span>
                }
            </div>
        }
    </div>`,
    standalone: true,
    styleUrls: ['./question-review.component.scss'],
    imports: [FormsModule, MathJaxDirective, LowerCasePipe, TranslateModule],
})
export class QuestionReviewComponent {
    @Input() review!: QuestionReview;
    @Output() selected = new EventEmitter<{ id: number; selected: boolean }>();

    constructor(
        private QuestionReview: QuestionReviewService,
        private Session: SessionService,
    ) {}

    getAssessedAnswerCount = () => this.QuestionReview.getProcessedAnswerCount(this.review, this.Session.getUser());

    reviewSelected = () => this.selected.emit({ id: this.review.question.id, selected: this.review.selected });
}
