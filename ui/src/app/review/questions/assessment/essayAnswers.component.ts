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

import { ReviewQuestion } from '../../review.model';
import { QuestionReviewService } from '../questionReview.service';

@Component({
    selector: 'essay-answers',
    template: `
        <div class="top-row">
            <div class="col-md-12" *ngFor="let answer of answers">
                <essay-answer
                    [answer]="answer"
                    [editable]="editable"
                    [action]="actionText"
                    (onSelection)="assessEssay(answer)"
                ></essay-answer>
            </div>
            <div *ngIf="answers.length === 0" class="col-md-12">
                <div class="jumbotron padl20">
                    <p class="lead">{{ 'sitnet_no_answers_to_assess' | translate }}</p>
                </div>
            </div>
            <div *ngIf="answers.length > 0" class="col-md-12 mart20 marb30">
                <button class="btn btn-success" (click)="assessSelected()">
                    {{ actionText | translate }} ({{ countSelected() }})
                </button>
            </div>
        </div>
    `,
})
export class EssayAnswerListComponent {
    @Input() answers: ReviewQuestion[] = [];
    @Input() editable: boolean;
    @Input() isPremature: boolean;
    @Input() actionText: string;
    @Output() onAssessed = new EventEmitter<ReviewQuestion[]>();

    constructor(private QuestionReview: QuestionReviewService) {}

    countSelected = () => {
        if (!this.answers) {
            return 0;
        }
        return this.answers.filter(this.QuestionReview.isAssessed).length;
    };

    assessSelected = () => this.onAssessed.emit(this.answers.filter(this.QuestionReview.isAssessed));

    assessEssay = (answer: ReviewQuestion) => {
        if (this.QuestionReview.isAssessed(answer)) {
            this.onAssessed.emit([answer]);
        }
    };
}
