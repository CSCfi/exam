/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamSectionQuestion } from 'src/app/exam/exam.model';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-r-multi-choice-answer',
    template: `@for (option of sectionQuestion.options | orderBy: 'id'; track option) {
        <div class="ps-2 mb-2" [hidden]="!reviewExpanded">
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
    standalone: true,
    imports: [MathJaxDirective, TranslateModule, OrderByPipe],
    styleUrl: './multi-choice-answers.shared.scss',
})
export class MultiChoiceAnswerComponent {
    @Input() sectionQuestion!: ExamSectionQuestion;
    reviewExpanded = true;
}
