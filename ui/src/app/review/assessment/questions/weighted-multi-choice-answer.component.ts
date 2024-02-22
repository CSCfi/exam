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
import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamSectionQuestion } from '../../../exam/exam.model';
import { MathJaxDirective } from '../../../shared/math/math-jax.directive';
import { OrderByPipe } from '../../../shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-r-weighted-multi-choice-answer',
    template: `@for (option of sectionQuestion.options | orderBy: 'id'; track option) {
        <div class="ps-2 mb-2" [hidden]="!reviewExpanded">
            @if (option.answered) {
                <div>
                    @if (option.score >= 0) {
                        <div class="exam-answered-correct">
                            <div class="make-inline float-start">
                                <img src="/assets/images/icon_correct_answer_checkbox_green.svg" alt="" />
                            </div>
                            <div class="make-inline w-75 my-1 ms-3">
                                <span class="exam-question-option-text" [xmMathJax]="option.option.option"></span>
                            </div>
                            <div class="make-inline float-end">
                                <span class="text-success">
                                    {{ option.score }} {{ 'i18n_unit_points' | translate }}</span
                                >
                            </div>
                        </div>
                    }
                    @if (option.score < 0) {
                        <div class="exam-answered-wrong">
                            <div class="make-inline float-start">
                                <img src="/assets/images/icon_wrong_answer_checkbox_red.svg" alt="" />
                            </div>
                            <div class="make-inline w-75 my-1 ms-3">
                                <span class="exam-question-option-text" [xmMathJax]="option.option.option"></span>
                            </div>
                            <div class="make-inline float-end">
                                <span class="text-danger">
                                    {{ option.score }} {{ 'i18n_unit_points' | translate }}</span
                                >
                            </div>
                        </div>
                    }
                </div>
            }
            @if (!option.answered) {
                <div>
                    <div class="exam-not-answered">
                        <div class="make-inline float-start">
                            @if (option.score >= 0) {
                                <div>
                                    <img src="/assets/images/icon_correct_answer_checkbox_green.svg" alt="" />
                                </div>
                            }
                            @if (option.score < 0) {
                                <img src="/assets/images/icon_wrong_answer_checkbox.png" alt="" />
                            }
                        </div>
                        <div class="make-inline w-75 my-1 ms-3">
                            <span class="exam-question-option-text" [xmMathJax]="option.option.option"></span>
                        </div>
                        <div class="make-inline float-end">
                            <span [ngClass]="option.score >= 0 ? 'text-success' : 'text-danger'">
                                {{ option.score }} {{ 'i18n_unit_points' | translate }}</span
                            >
                        </div>
                    </div>
                </div>
            }
        </div>
    }`,
    standalone: true,
    imports: [MathJaxDirective, NgClass, TranslateModule, OrderByPipe],
    styleUrl: './multi-choice-answers.shared.scss',
})
export class WeightedMultiChoiceAnswerComponent {
    @Input() sectionQuestion!: ExamSectionQuestion;
    reviewExpanded = true;
}
