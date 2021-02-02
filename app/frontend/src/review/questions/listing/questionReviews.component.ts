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
import { Component, Input } from '@angular/core';
import { StateService } from '@uirouter/core';
import * as toast from 'toastr';

import { QuestionReviewService } from '../questionReview.service';

import type { QuestionReview } from '../../review.model';
@Component({
    selector: 'question-reviews',
    templateUrl: './questionReviews.component.html',
})
export class QuestionReviewsComponent {
    @Input() examId: number;
    reviews: QuestionReview[] = [];
    selectedReviews: number[] = [];
    selectionToggle = false;

    constructor(private state: StateService, private QuestionReview: QuestionReviewService) {}

    ngOnInit() {
        this.QuestionReview.getReviews$(this.examId).subscribe(
            (resp) => (this.reviews = resp),
            (err) => toast.error(err),
        );
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
        this.state.go('questionAssessment', { id: this.examId, q: this.selectedReviews.map((r) => r.toString()) });
}
