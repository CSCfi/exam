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
import { NgClass, SlicePipe, UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { SessionService } from '../../../session/session.service';
import type { QuestionReview } from '../../review.model';
import { QuestionReviewService } from '../question-review.service';

@Component({
    selector: 'xm-question-flow-category',
    template: `<div class="row me-2 mb-2 mt-2">
            <span class="col-10">
                <strong>{{ categoryTitle | translate | uppercase }}</strong
                >&nbsp;
                <span class="badge bg-danger">{{ reviews.length }}</span>
            </span>
            <div class="col-2" [hidden]="reviews.length === 0">
                <a (click)="hideCategory = !hideCategory" class="pointer-hand float-end">
                    @if (hideCategory) {
                        <img src="/assets/images/icon_list_show_right.svg" />
                    } @else {
                        <img src="/assets/images/icon_list_show_down.svg" />
                    }
                </a>
            </div>
        </div>
        <div class="question-flow-category-questions">
            @for (r of reviews; track r) {
                <div [ngbCollapse]="hideCategory" class="row">
                    <div class="col-md-1">
                        <input type="radio" [checked]="r.selected" (change)="selectQuestion(r)" />
                    </div>
                    <div class="col-md-9">
                        <div [innerHtml]="r.question.question | slice: 0 : 50"></div>
                    </div>
                    <div class="col-md-2">
                        <div [ngClass]="isFinalized(r) ? 'text-success' : ''">
                            {{ r.answers.length - getAssessedAnswerCount(r) }} / {{ r.answers.length }}
                        </div>
                    </div>
                </div>
            }
        </div>`,
    standalone: true,
    imports: [NgClass, UpperCasePipe, SlicePipe, TranslateModule, NgbCollapse],
})
export class QuestionFlowCategoryComponent {
    @Input() categoryTitle = '';
    @Input() reviews: QuestionReview[] = [];
    @Input() allDone = false;
    @Output() selected = new EventEmitter<QuestionReview>();

    hideCategory = false;

    constructor(
        private QuestionReview: QuestionReviewService,
        private Session: SessionService,
    ) {}

    isFinalized = (review: QuestionReview) => this.QuestionReview.isFinalized(review);

    getAssessedAnswerCount = (review: QuestionReview) =>
        this.allDone ? 0 : this.QuestionReview.getProcessedAnswerCount(review, this.Session.getUser());

    selectQuestion = (review: QuestionReview) => this.selected.emit(review);
}
