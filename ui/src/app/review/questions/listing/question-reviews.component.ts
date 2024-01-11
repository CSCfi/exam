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

import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamTabService } from '../../../exam/editor/exam-tabs.service';
import type { QuestionReview } from '../../review.model';
import { QuestionReviewService } from '../question-review.service';
import { QuestionReviewComponent } from './question-review.component';

@Component({
    selector: 'xm-question-reviews',
    template: `<div class="row ms-2 me-2">
        <div class="p-2 mt-2">
            <img class="me-3" src="/assets/images/icon_info.png" alt="info" />
            <strong>{{ 'i18n_question_review_info' | translate }}</strong>
            {{ 'i18n_question_review_info_detailed' | translate }}
        </div>

        @if (reviews.length === 0) {
            <div>
                <div class="mart20">
                    <h3>{{ 'i18n_no_questions_to_review' | translate }}</h3>
                </div>
            </div>
        }
        @if (reviews.length > 0) {
            <div>
                <div class="mart20 d-flex justify-content-between">
                    <div>
                        <strong class="question-review-toolbar-text"
                            >{{ selectedReviews.length }} {{ 'i18n_questions_selected' | translate }}</strong
                        >
                    </div>
                    <div>
                        <button
                            [disabled]="selectedReviews.length === 0"
                            class="btn btn-success float-end"
                            (click)="startReview()"
                        >
                            {{ 'i18n_review_selected' | translate }} ({{ selectedReviews.length }})
                        </button>
                    </div>
                </div>
                <span class="mart20 marb10 d-flex justify-content-between">
                    <span class="question-review-title">{{ 'i18n_select_question_reviews' | translate }}</span>
                    <span class="form-group">
                        <label class="me-2" for="select-all">{{ 'i18n_check_uncheck_all' | translate }}</label>
                        <input id="select-all" type="checkbox" (change)="selectAll()" [(ngModel)]="selectionToggle" />
                    </span>
                </span>
                <div>
                    @for (review of reviews; track review) {
                        <xm-question-review [review]="review" (selected)="onReviewSelection($event)">
                        </xm-question-review>
                    }
                </div>
                <div class="mart20 d-flex justify-content-between">
                    <!-- Might make sense to make this a separate component as it is used twice here-->
                    <span>
                        <strong class="question-review-toolbar-text"
                            >{{ selectedReviews.length }} {{ 'i18n_questions_selected' | translate }}</strong
                        >
                    </span>
                    <div>
                        <button
                            [disabled]="selectedReviews.length === 0"
                            class="btn btn-success"
                            (click)="startReview()"
                        >
                            {{ 'i18n_review_selected' | translate }} ({{ selectedReviews.length }})
                        </button>
                    </div>
                </div>
            </div>
        }
    </div>`,
    standalone: true,
    imports: [FormsModule, QuestionReviewComponent, TranslateModule],
})
export class QuestionReviewsComponent implements OnInit {
    examId = 0;
    reviews: QuestionReview[] = [];
    selectedReviews: number[] = [];
    selectionToggle = false;

    constructor(
        private router: Router,
        private toast: ToastrService,
        private QuestionReview: QuestionReviewService,
        private Tabs: ExamTabService,
    ) {}

    ngOnInit() {
        this.examId = this.Tabs.getExam().id;
        this.QuestionReview.getReviews$(this.examId).subscribe({
            next: (resp) => (this.reviews = resp),
            error: (err) => this.toast.error(err),
        });
        this.Tabs.notifyTabChange(6);
    }

    onReviewSelection = (event: { id: number; selected: boolean }) => {
        const index = this.selectedReviews.indexOf(event.id);
        if (event.selected && index === -1) {
            this.selectedReviews.push(event.id);
        } else if (index > -1) {
            this.selectedReviews.splice(index, 1);
        }
    };

    removeSelections = () => {
        this.reviews.forEach((r) => (r.selected = false));
        this.selectedReviews = [];
    };

    addSelections = () => {
        this.reviews.forEach((r) => (r.selected = true));
        this.selectedReviews = this.reviews.map((r) => r.question.id);
    };

    selectAll = () => (this.selectionToggle ? this.addSelections() : this.removeSelections());

    startReview = () =>
        this.router.navigate(['/staff/assessments', this.examId, 'questions'], {
            queryParams: { q: this.selectedReviews },
        });
}
