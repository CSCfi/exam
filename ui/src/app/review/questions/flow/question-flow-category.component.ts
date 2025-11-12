// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, SlicePipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionReviewService } from 'src/app/review/questions/question-review.service';
import type { QuestionReview } from 'src/app/review/review.model';
import { SessionService } from 'src/app/session/session.service';

@Component({
    selector: 'xm-question-flow-category',
    template: `<div class="row me-2 mb-2 mt-2">
            <span class="col-10">
                <strong>{{ categoryTitle() | translate | uppercase }}</strong
                >&nbsp;
                <span class="badge bg-danger">{{ reviews().length }}</span>
            </span>
            <div class="col-2" [hidden]="reviews().length === 0">
                <a (click)="toggleHideCategory()" class="pointer-hand float-end">
                    @if (hideCategory()) {
                        <img src="/assets/images/icon_list_show_right.svg" />
                    } @else {
                        <img src="/assets/images/icon_list_show_down.svg" />
                    }
                </a>
            </div>
        </div>
        <div class="question-flow-category-questions">
            @for (r of reviews(); track r) {
                <div [ngbCollapse]="hideCategory()" class="row">
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
    imports: [NgClass, UpperCasePipe, SlicePipe, TranslateModule, NgbCollapse],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionFlowCategoryComponent {
    categoryTitle = input('');
    reviews = input<QuestionReview[]>([]);
    allDone = input(false);
    selected = output<QuestionReview>();

    hideCategory = signal(false);

    private QuestionReview = inject(QuestionReviewService);
    private Session = inject(SessionService);

    isFinalized(review: QuestionReview) {
        return this.QuestionReview.isFinalized(review);
    }

    getAssessedAnswerCount(review: QuestionReview) {
        return this.allDone() ? 0 : this.QuestionReview.getProcessedAnswerCount(review, this.Session.getUser());
    }

    selectQuestion(review: QuestionReview) {
        this.selected.emit(review);
    }

    toggleHideCategory() {
        this.hideCategory.update((v) => !v);
    }
}
