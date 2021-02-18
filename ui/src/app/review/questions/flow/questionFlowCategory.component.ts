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
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { SessionService } from '../../../session/session.service';
import type { QuestionReview } from '../../review.model';
import { QuestionReviewService } from '../questionReview.service';

@Component({
    selector: 'question-flow-category',
    templateUrl: './questionFlowCategory.component.html',
})
export class QuestionFlowCategoryComponent {
    @Input() categoryTitle: string;
    @Input() reviews: QuestionReview[] = [];
    @Input() allDone: boolean;
    @Output() onSelection = new EventEmitter<QuestionReview>();

    hideCategory = false;

    constructor(private QuestionReview: QuestionReviewService, private Session: SessionService) {}

    isFinalized = (review: QuestionReview) => this.QuestionReview.isFinalized(review);

    getAssessedAnswerCount = (review: QuestionReview) =>
        this.allDone ? 0 : this.QuestionReview.getProcessedAnswerCount(review, this.Session.getUser());

    selectQuestion = (review: QuestionReview) => this.onSelection.emit(review);
}
