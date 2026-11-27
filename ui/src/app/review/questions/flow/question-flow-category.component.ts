// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { SlicePipe, UpperCasePipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionReviewService } from 'src/app/review/questions/question-review.service';
import type { QuestionReview } from 'src/app/review/review.model';
import { SessionService } from 'src/app/session/session.service';

@Component({
    selector: 'xm-question-flow-category',
    template: `<div class="xm-split flow-category-header">
            <span>
                <strong>{{ categoryTitle() | translate | uppercase }}</strong
                >&nbsp;
                <span class="badge bg-danger">{{ reviews().length }}</span>
            </span>
            <button
                type="button"
                class="btn btn-link p-0"
                [hidden]="reviews().length === 0"
                (click)="toggleHideCategory()"
                [ariaExpanded]="!hideCategory()"
                [ariaLabel]="categoryTitle() | translate"
            >
                @if (hideCategory()) {
                    <img src="/assets/images/icon_list_show_right.svg" alt="" />
                } @else {
                    <img src="/assets/images/icon_list_show_down.svg" alt="" />
                }
            </button>
        </div>
        <div class="question-flow-category-questions">
            @for (r of reviews(); track r) {
                <div [ngbCollapse]="hideCategory()" class="flow-question">
                    <input
                        type="radio"
                        [checked]="r.selected"
                        (change)="selectQuestion(r)"
                        [attr.aria-labelledby]="'flow-question-' + r.question.id"
                    />
                    <div
                        [id]="'flow-question-' + r.question.id"
                        [innerHtml]="r.question.question | slice: 0 : 50"
                    ></div>
                    <div [class.xm-text-success]="isFinalized(r)" [class.xm-text-danger]="!isFinalized(r)">
                        {{ r.answers.length - getAssessedAnswerCount(r) }} / {{ r.answers.length }}
                    </div>
                </div>
            }
        </div>`,
    styles: `
        .flow-category-header {
            margin-block: var(--xm-space-2);
            padding-inline-end: 1.25rem;
        }
        // Radio, question and the count of answers left, side by side also on phones
        .flow-question {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            column-gap: var(--xm-space-3);
            align-items: baseline;
        }
    `,
    imports: [UpperCasePipe, SlicePipe, TranslateModule, NgbCollapse],
})
export class QuestionFlowCategoryComponent {
    readonly categoryTitle = input('');
    readonly reviews = input<QuestionReview[]>([]);
    readonly allDone = input(false);
    readonly selected = output<QuestionReview>();

    readonly hideCategory = signal(false);

    private readonly QuestionReview = inject(QuestionReviewService);
    private readonly Session = inject(SessionService);

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
