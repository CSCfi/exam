// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamSectionQuestion } from 'src/app/exam/exam.model';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-r-weighted-multi-choice-answer',
    template: `@for (option of sectionQuestion.options | orderBy: 'id'; track option) {
        <div class="ps-2 mb-2" [hidden]="!reviewExpanded">
            @if (option.answered) {
                @if (option.score >= 0) {
                    <div class="exam-answered-correct">
                        <div class="make-inline float-start">
                            <img src="/assets/images/icon_correct_answer_checkbox_green.svg" alt="" />
                        </div>
                        <div class="make-inline w-75 my-1 ms-3">
                            <span class="exam-question-option-text">{{ option.option.option }}</span>
                        </div>
                        <div class="make-inline float-end">
                            <span class="text-success"> {{ option.score }} {{ 'i18n_unit_points' | translate }}</span>
                        </div>
                    </div>
                } @else {
                    <div class="exam-answered-wrong">
                        <div class="make-inline float-start">
                            <img src="/assets/images/icon_wrong_answer_checkbox_red.svg" alt="" />
                        </div>
                        <div class="make-inline w-75 my-1 ms-3">
                            <span class="exam-question-option-text">{{ option.option.option }}</span>
                        </div>
                        <div class="make-inline float-end">
                            <span class="text-danger"> {{ option.score }} {{ 'i18n_unit_points' | translate }}</span>
                        </div>
                    </div>
                }
            } @else {
                <div class="exam-not-answered">
                    <div class="make-inline float-start">
                        @if (option.score >= 0) {
                            <div>
                                <img src="/assets/images/icon_correct_answer_checkbox_green.svg" alt="" />
                            </div>
                        } @else {
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
