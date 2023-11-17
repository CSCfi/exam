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
import { LowerCasePipe, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SessionService } from '../../../session/session.service';
import { MathJaxDirective } from '../../../shared/math/math-jax.directive';
import type { QuestionReview } from '../../review.model';
import { QuestionReviewService } from '../question-review.service';

@Component({
    selector: 'xm-question-review',
    template: `<div class="student-enrolment-wrapper essay-review">
        <div class="review-points-exam d-flex justify-content-between">
            <div>
                <img
                    *ngIf="getAssessedAnswerCount() === review.answers.length"
                    src="/assets/images/icon_question_type_ready.png"
                />
                <img
                    *ngIf="getAssessedAnswerCount() !== review.answers.length"
                    src="/assets/images/icon_question_type_ready_grey.png"
                />

                <span class="vcenter marl10">
                    {{ getAssessedAnswerCount() }} / {{ review.answers.length }}
                    {{ 'sitnet_graded' | translate | lowercase }}
                </span>
            </div>
            <span class="float-end dropdown pointer-hand single-question-icon" uib-dropdown>
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
        <div class="review-points-exam" *ngIf="review.question.defaultEvaluationType === 'Points'">
            {{ review.question.defaultMaxScore }} {{ 'sitnet_unit_points' | translate }}
        </div>
        <div class="review-points-exam" *ngIf="review.question.defaultEvaluationType === 'Selection'">
            {{ 'sitnet_evaluation_select' | translate }}
        </div>

        <!-- Question -->
        <div class="marl10 make-inline">
            <div class="review-question-title make-inline" [xmMathJax]="review.question.question"></div>
            <a
                (click)="review.expanded = !review.expanded"
                class="pointer-hand"
                *ngIf="review.question.defaultAnswerInstructions"
            >
                <img
                    *ngIf="!review.expanded"
                    src="/assets/images/icon_list_show_right.svg"
                    alt=""
                    onerror="this.onerror=null;this.src='/assets/images/icon_list_show_right.png'"
                />
                <img
                    *ngIf="review.expanded"
                    src="/assets/images/icon_list_show_down.svg"
                    alt=""
                    onerror="this.onerror=null;this.src='/assets/images/icon_list_show_down.png'"
                />
            </a>
        </div>

        <div *ngIf="review.expanded">
            <img
                *ngIf="
                    review.question.defaultAnswerInstructions && review.question.defaultAnswerInstructions.length > 0
                "
                src="/assets/images/icon_info.png"
                alt=""
                onerror="this.onerror=null;this.src='/assets/images/icon_info.png'"
            />
            <span
                *ngIf="
                    review.question.defaultAnswerInstructions && review.question.defaultAnswerInstructions.length > 0
                "
                class="padl10"
            >
                {{ review.question.defaultAnswerInstructions }}</span
            >
        </div>
    </div> `,
    standalone: true,
    imports: [NgIf, FormsModule, MathJaxDirective, LowerCasePipe, TranslateModule],
})
export class QuestionReviewComponent {
    @Input() review!: QuestionReview;
    @Output() selected = new EventEmitter<{ id: number; selected: boolean }>();

    constructor(private QuestionReview: QuestionReviewService, private Session: SessionService) {}

    getAssessedAnswerCount = () => this.QuestionReview.getProcessedAnswerCount(this.review, this.Session.getUser());

    reviewSelected = () => this.selected.emit({ id: this.review.question.id, selected: this.review.selected });
}
