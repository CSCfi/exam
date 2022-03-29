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
import type { SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { SessionService } from '../../../session/session.service';
import type { QuestionReview } from '../../review.model';
import { QuestionReviewService } from '../questionReview.service';

@Component({
    selector: 'question-flow',
    templateUrl: './questionFlow.component.html',
})
export class QuestionFlowComponent implements OnInit, OnChanges {
    @Input() reviews: QuestionReview[] = [];
    @Output() selected = new EventEmitter<number>();

    unfinished: QuestionReview[] = [];
    finished: QuestionReview[] = [];

    constructor(private QuestionReview: QuestionReviewService, private Session: SessionService) {}

    private init = () => {
        this.unfinished = this.reviews.filter((r) => this.getAssessedAnswerCount(r) < r.answers.length);
        this.finished = this.reviews.filter((r) => this.getAssessedAnswerCount(r) === r.answers.length);
    };

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
}
