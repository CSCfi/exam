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
import { Component, Input } from '@angular/core';
import type { ExamSectionQuestion, ExamSectionQuestionOption } from '../../../exam/exam.model';
import { QuestionService } from '../../../question/question.service';

@Component({
    selector: 'xm-r-claim-choice-answer',
    template: `<div *ngIf="reviewExpanded">
        <div class="padl15 marb10" *ngFor="let option of sectionQuestion.options | orderBy : 'option.id'">
            <div [ngClass]="getSelectedOptionClass(option)">
                <div class="make-inline float-start">
                    <img
                        *ngIf="determineClaimOptionType(option) === 'CorrectOption'"
                        src="/assets/images/icon_correct_answer_radio.png"
                        alt=""
                    />
                    <img
                        *ngIf="determineClaimOptionType(option) === 'IncorrectOption'"
                        src="/assets/images/icon_wrong_answer_radio.png"
                        alt=""
                    />
                    <img
                        *ngIf="determineClaimOptionType(option) === 'SkipOption'"
                        src="/assets/images/icon_correct_answer_radio_grey.png"
                        alt=""
                    />
                </div>
                <div class="make-inline middle-column">
                    <span class="exam-question-option-text" [innerHtml]="option.option.option"></span>
                </div>
                <div class="make-inline float-end answer-score-text">
                    <span> {{ option.score }} {{ 'sitnet_unit_points' | translate }}</span>
                </div>
            </div>
        </div>
    </div> `,
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
