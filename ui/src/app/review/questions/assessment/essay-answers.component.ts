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
import { TranslateModule } from '@ngx-translate/core';
import type { ReviewQuestion } from '../../review.model';
import { QuestionReviewService } from '../question-review.service';
import { EssayAnswerComponent } from './essay-answer.component';

@Component({
    selector: 'xm-essay-answers',
    template: `
        <div class="row mt-3">
            @for (answer of answers; track answer) {
                <div class="col-md-12 mb-3">
                    <xm-essay-answer
                        [answer]="answer"
                        [editable]="editable"
                        [action]="actionText"
                        (selected)="assessEssay(answer)"
                    ></xm-essay-answer>
                </div>
            } @empty {
                <div class="col-md-12">
                    <div class="mt-4 p-5 bg-primary text-white rounded">
                        <p class="lead">{{ 'i18n_no_answers_to_assess' | translate }}</p>
                    </div>
                </div>
            }
            @if (answers.length > 0) {
                <div class="col-md-12 mt-2 mb-3">
                    <button class="btn btn-success" (click)="assessSelected()">
                        {{ actionText | translate }} ({{ countSelected() }})
                    </button>
                </div>
            }
        </div>
    `,
    standalone: true,
    imports: [EssayAnswerComponent, TranslateModule],
})
export class EssayAnswerListComponent {
    @Input() answers: ReviewQuestion[] = [];
    @Input() editable = false;
    @Input() isPremature = false;
    @Input() actionText = '';
    @Output() assessed = new EventEmitter<ReviewQuestion[]>();

    constructor(private QuestionReview: QuestionReviewService) {}

    countSelected = () => {
        if (!this.answers) {
            return 0;
        }
        return this.answers.filter((a) => this.QuestionReview.isAssessed(a)).length;
    };

    assessSelected = () => {
        this.answers.forEach((a) => {
            a.selected = true;
        });

        this.assessed.emit(this.answers.filter(this.QuestionReview.isAssessed));
    };

    assessEssay = (answer: ReviewQuestion) => {
        if (this.QuestionReview.isAssessed(answer)) {
            this.assessed.emit([answer]);
        }
    };
}
