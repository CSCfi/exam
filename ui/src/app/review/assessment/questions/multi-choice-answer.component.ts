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
import type { ExamSectionQuestion } from '../../../exam/exam.model';

@Component({
    selector: 'xm-r-multi-choice-answer',
    template: `<div
        class="padl15 marb10"
        [hidden]="!reviewExpanded"
        *ngFor="let option of sectionQuestion.options | orderBy : 'id'"
    >
        <div *ngIf="option.answered">
            <div *ngIf="option.option.correctOption" class="exam-answered-correct">
                <div class="make-inline float-start">
                    <img
                        *ngIf="option.answered"
                        src="/assets/images/icon_correct_answer_radio.png"
                        alt="exam"
                        onerror="this.onerror=null;this.src='/assets/images/icon_correct_answer_radio.png'"
                    />
                </div>
                <div class="make-inline middle-column">
                    <span class="exam-question-option-text" [xmMathJax]="option.option.option"></span>
                </div>
            </div>
            <div *ngIf="!option.option.correctOption" class="exam-answered-wrong">
                <div class="make-inline float-start">
                    <img
                        *ngIf="option.answered"
                        src="/assets/images/icon_wrong_answer_radio.png"
                        alt="exam"
                        onerror="this.onerror=null;this.src='/assets/images/icon_wrong_answer_radio.svg'"
                    />
                </div>
                <div class="make-inline middle-column">
                    <span class="exam-question-option-text" [xmMathJax]="option.option.option"></span>
                </div>
            </div>
        </div>
        <div *ngIf="!option.answered">
            <div class="exam-not-answered">
                <div class="make-inline float-start">
                    <img
                        *ngIf="option.option.correctOption"
                        src="/assets/images/icon_correct_answer_radio.png"
                        alt="exam"
                        onerror="this.onerror=null;this.src='/assets/images/icon_correct_answer_radio.svg'"
                    />
                    <img
                        *ngIf="!option.option.correctOption"
                        src="/assets/images/icon_wrong_answer.png"
                        alt="exam"
                        onerror="this.onerror=null;this.src='/assets/images/icon_wrong_answer.svg'"
                    />
                </div>
                <div class="make-inline middle-column">
                    <span class="exam-question-option-text" [xmMathJax]="option.option.option"></span>
                </div>
            </div>
        </div>
    </div> `,
})
export class MultiChoiceAnswerComponent {
    @Input() sectionQuestion!: ExamSectionQuestion;
    reviewExpanded = true;
}
