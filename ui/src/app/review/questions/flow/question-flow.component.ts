// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
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
        @if (unfinished) {
            <xm-question-flow-category
                categoryTitle="i18n_in_progress"
                [reviews]="unfinished"
                (selected)="questionSelected($event)"
            >
            </xm-question-flow-category>
        }
        @if (finished) {
            <xm-question-flow-category
                categoryTitle="i18n_all_finished"
                [reviews]="finished"
                [allDone]="true"
                (selected)="questionSelected($event)"
            >
            </xm-question-flow-category>
        }`,
    styleUrls: ['./question-flow.component.scss'],
    imports: [QuestionFlowCategoryComponent, TranslateModule],
})
export class QuestionFlowComponent implements OnInit, OnChanges {
    @Input() reviews: QuestionReview[] = [];
    @Output() selected = new EventEmitter<number>();

    unfinished: QuestionReview[] = [];
    finished: QuestionReview[] = [];

    constructor(
        private QuestionReview: QuestionReviewService,
        private Session: SessionService,
    ) {}

    getAssessedAnswerCount = (review: QuestionReview) =>
        this.QuestionReview.getProcessedAnswerCount(review, this.Session.getUser());

    ngOnInit() {
        this.init();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.reviews) {
            this.init();
        }
    }

    questionSelected = (review: QuestionReview) => {
        this.unfinished.concat(this.finished).forEach((r) => (r.selected = r.question.id === review.question.id));
        this.selected.emit(this.reviews.indexOf(review));
    };

    private init = () => {
        this.unfinished = this.reviews.filter((r) => this.getAssessedAnswerCount(r) < r.answers.length);
        this.finished = this.reviews.filter((r) => this.getAssessedAnswerCount(r) === r.answers.length);
    };
}
