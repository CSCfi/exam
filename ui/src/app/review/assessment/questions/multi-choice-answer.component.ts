// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamSectionQuestion } from 'src/app/question/question.model';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-r-multi-choice-answer',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `@for (option of sectionQuestion().options | orderBy: 'id'; track option) {
        <div class="ps-2 mb-2" [hidden]="!reviewExpanded()">
            @if (option.answered) {
                @if (option.option.correctOption) {
                    <div class="exam-answered-correct d-flex align-items-center gap-2">
                        <img
                            class="flex-shrink-0"
                            src="/assets/images/icon_correct_answer_radio.svg"
                            [ariaLabel]="'i18n_correct_answer' | translate"
                            alt=""
                        />
                        <span class="exam-question-option-text flex-grow-1 text-break">{{ option.option.option }}</span>
                    </div>
                }
                @if (!option.option.correctOption) {
                    <div class="exam-answered-wrong d-flex align-items-center gap-2">
                        <img
                            class="flex-shrink-0"
                            src="/assets/images/icon_wrong_answer_radio.svg"
                            [ariaLabel]="'i18n_incorrect_answer' | translate"
                            alt=""
                        />
                        <span class="exam-question-option-text flex-grow-1 text-break">{{ option.option.option }}</span>
                    </div>
                }
            } @else {
                <div class="exam-not-answered d-flex align-items-center gap-2">
                    @if (option.option.correctOption) {
                        <img
                            class="flex-shrink-0"
                            src="/assets/images/icon_correct_answer_radio.svg"
                            [ariaLabel]="'i18n_correct_answer' | translate"
                            alt=""
                        />
                    }
                    @if (!option.option.correctOption) {
                        <img
                            class="flex-shrink-0"
                            src="/assets/images/icon_wrong_answer.png"
                            [ariaLabel]="'i18n_incorrect_answer' | translate"
                            alt=""
                        />
                    }
                    <span class="exam-question-option-text flex-grow-1 text-break">{{ option.option.option }}</span>
                </div>
            }
        </div>
    }`,
    imports: [TranslateModule, OrderByPipe],
    styleUrl: './multi-choice-answers.shared.scss',
})
export class MultiChoiceAnswerComponent {
    readonly sectionQuestion = input.required<ExamSectionQuestion>();

    readonly reviewExpanded = signal(true);
}
