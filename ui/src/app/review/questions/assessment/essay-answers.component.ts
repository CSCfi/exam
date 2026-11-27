// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionReviewService } from 'src/app/review/questions/question-review.service';
import type { ReviewQuestion } from 'src/app/review/review.model';
import { EssayAnswerComponent } from './essay-answer.component';

@Component({
    selector: 'xm-essay-answers',
    template: `
        <div class="xm-stack essay-answers">
            @for (answer of answers(); track answer) {
                <xm-essay-answer
                    [answer]="answer"
                    [editable]="editable()"
                    [action]="actionText()"
                    (selected)="assessEssay(answer)"
                ></xm-essay-answer>
            } @empty {
                <div class="no-answers p-5 xm-bg-info xm-text-inverse rounded">
                    <p class="xm-text-xl">{{ 'i18n_no_answers_to_assess' | translate }}</p>
                </div>
            }
            @if (answers().length > 0) {
                <div class="assess-selected">
                    <button class="btn btn-success" (click)="assessSelected()">
                        {{ actionText() | translate }} ({{ countSelected() }})
                    </button>
                </div>
            }
        </div>
    `,
    styles: `
        .essay-answers {
            margin-block: var(--xm-space-3);
        }
        .no-answers {
            margin-top: var(--xm-space-4);
        }
        .assess-selected {
            margin-top: var(--xm-space-2);
        }
    `,
    imports: [EssayAnswerComponent, TranslateModule],
})
export class EssayAnswerListComponent {
    readonly answers = input<ReviewQuestion[]>([]);
    readonly editable = input(false);
    readonly isPremature = input(false);
    readonly actionText = input('');
    readonly assessed = output<ReviewQuestion[]>();

    private readonly QuestionReview = inject(QuestionReviewService);

    countSelected() {
        const currentAnswers = this.answers();
        if (!currentAnswers) {
            return 0;
        }
        return currentAnswers.filter((a) => this.QuestionReview.isAssessed(a)).length;
    }

    assessSelected() {
        const currentAnswers = this.answers();
        currentAnswers.forEach((a) => {
            a.selected = true;
        });

        this.assessed.emit(currentAnswers.filter(this.QuestionReview.isAssessed));
    }

    assessEssay(answer: ReviewQuestion) {
        if (this.QuestionReview.isAssessed(answer)) {
            this.assessed.emit([answer]);
        }
    }
}
