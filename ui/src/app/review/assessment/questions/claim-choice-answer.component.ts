/*
 * Copyright (c) 2019 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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
import type { ExamSectionQuestion, ExamSectionQuestionOption } from 'src/app/exam/exam.model';
import { QuestionService } from 'src/app/question/question.service';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-r-claim-choice-answer',
    template: `@if (reviewExpanded) {
        <div>
            @for (option of sectionQuestion.options | orderBy: 'option.id'; track option) {
                <div class="ps-2 mb-2">
                    <div [ngClass]="getSelectedOptionClass(option)">
                        <div class="make-inline float-start">
                            @switch (determineClaimOptionType(option)) {
                                @case ('CorrectOption') {
                                    <img src="/assets/images/icon_correct_answer_radio.png" alt="" />
                                }
                                @case ('IncorrectOption') {
                                    <img src="/assets/images/icon_wrong_answer_radio.png" alt="" />
                                }
                                @case ('SkipOption') {
                                    <img src="/assets/images/icon_correct_answer_radio_grey.png" alt="" />
                                }
                            }
                        </div>
                        <div class="make-inline w-75 my-1 ms-3">
                            <span class="exam-question-option-text" [innerHtml]="option.option.option"></span>
                        </div>
                        <div class="make-inline float-end answer-score-text">
                            <span> {{ option.score }} {{ 'i18n_unit_points' | translate }}</span>
                        </div>
                    </div>
                </div>
            }
        </div>
    }`,
    standalone: true,
    imports: [NgClass, TranslateModule, OrderByPipe],
    styleUrl: './multi-choice-answers.shared.scss',
})
export class ClaimChoiceAnswerComponent {
    @Input() sectionQuestion!: ExamSectionQuestion;

    reviewExpanded = true;

    constructor(private Question: QuestionService) {}

    determineClaimOptionType = (option: ExamSectionQuestionOption) =>
        this.Question.determineClaimOptionTypeForExamQuestionOption(option);

    getSelectedOptionClass = (option: ExamSectionQuestionOption) => {
        if (!option.answered) {
            return 'exam-not-answered';
        }
        switch (this.determineClaimOptionType(option)) {
            case 'CorrectOption':
                return 'exam-answered-correct';
            case 'IncorrectOption':
                return 'exam-answered-wrong';
            case 'SkipOption':
                return 'exam-answered-skip';
            default:
                return 'exam-not-answered';
        }
    };
}
