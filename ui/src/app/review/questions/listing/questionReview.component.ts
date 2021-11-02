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
import { QuestionReviewService } from '../questionReview.service';

import type { QuestionReview } from '../../review.model';

@Component({
    selector: 'question-review',
    templateUrl: './questionReview.component.html',
})
export class QuestionReviewComponent {
    @Input() review: QuestionReview;
    @Output() onSelection = new EventEmitter<{ id: number; selected: boolean }>();

    constructor(private QuestionReview: QuestionReviewService, private Session: SessionService) {}

    getAssessedAnswerCount = () => this.QuestionReview.getProcessedAnswerCount(this.review, this.Session.getUser());

    reviewSelected = () => this.onSelection.emit({ id: this.review.question.id, selected: this.review.selected });
}
