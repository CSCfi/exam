// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionReviewService } from 'src/app/review/questions/question-review.service';
import type { ReviewQuestion } from 'src/app/review/review.model';
import { EssayAnswerComponent } from './essay-answer.component';

@Component({
    selector: 'xm-essay-answers',
    template: `
        <div class="row mt-3">
            @for (answer of answers(); track answer) {
                <div class="col-md-12 mb-3">
                    <xm-essay-answer
                        [answer]="answer"
                        [editable]="editable()"
                        [action]="actionText()"
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
            @if (answers().length > 0) {
                <div class="col-md-12 mt-2 mb-3">
                    <button class="btn btn-success" (click)="assessSelected()">
                        {{ actionText() | translate }} ({{ countSelected() }})
                    </button>
                </div>
            }
        </div>
    `,
    imports: [EssayAnswerComponent, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EssayAnswerListComponent {
    answers = input<ReviewQuestion[]>([]);
    editable = input(false);
    isPremature = input(false);
    actionText = input('');
    assessed = output<ReviewQuestion[]>();

    private QuestionReview = inject(QuestionReviewService);

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
