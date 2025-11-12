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
                    <div class="exam-answered-correct">
                        <div class="make-inline float-start">
                            @if (option.answered) {
                                <img
                                    src="/assets/images/icon_correct_answer_radio.svg"
                                    [attr.aria-label]="'i18n_correct_answer' | translate"
                                    alt=""
                                />
                            }
                        </div>
                        <div class="make-inline w-75 my-1 ms-3">
                            <span class="exam-question-option-text">{{ option.option.option }}</span>
                        </div>
                    </div>
                }
                @if (!option.option.correctOption) {
                    <div class="exam-answered-wrong">
                        <div class="make-inline float-start">
                            @if (option.answered) {
                                <img
                                    src="/assets/images/icon_wrong_answer_radio.svg"
                                    [attr.aria-label]="'i18n_incorrect_answer' | translate"
                                    alt=""
                                />
                            }
                        </div>
                        <div class="make-inline w-75 my-1 ms-3">
                            <span class="exam-question-option-text">{{ option.option.option }}</span>
                        </div>
                    </div>
                }
            } @else {
                <div class="exam-not-answered">
                    <div class="make-inline float-start">
                        @if (option.option.correctOption) {
                            <img
                                src="/assets/images/icon_correct_answer_radio.svg"
                                [attr.aria-label]="'i18n_correct_answer' | translate"
                                alt=""
                            />
                        }
                        @if (!option.option.correctOption) {
                            <img
                                src="/assets/images/icon_wrong_answer.png"
                                [attr.aria-label]="'i18n_incorrect_answer' | translate"
                                alt=""
                            />
                        }
                    </div>
                    <div class="make-inline w-75 my-1 ms-3">
                        <span class="exam-question-option-text">{{ option.option.option }}</span>
                    </div>
                </div>
            }
        </div>
    }`,
    imports: [TranslateModule, OrderByPipe],
    styleUrl: './multi-choice-answers.shared.scss',
})
export class MultiChoiceAnswerComponent {
    sectionQuestion = input.required<ExamSectionQuestion>();
    reviewExpanded = signal(true);
}
