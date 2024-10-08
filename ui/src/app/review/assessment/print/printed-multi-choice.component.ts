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
import { NgClass, NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamSectionQuestion } from 'src/app/exam/exam.model';
import { QuestionService } from 'src/app/question/question.service';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';

@Component({
    selector: 'xm-printed-multi-choice',
    templateUrl: './templates/multi-choice.component.html',
    styleUrls: ['./print.shared.scss'],
    standalone: true,
    imports: [MathJaxDirective, NgClass, NgStyle, TranslateModule],
})
export class PrintedMultiChoiceComponent {
    @Input() sectionQuestion!: ExamSectionQuestion;

    constructor(private Question: QuestionService) {}

    scoreWeightedMultipleChoiceAnswer = (ignoreForcedScore: boolean) => {
        if (this.sectionQuestion.question.type !== 'WeightedMultipleChoiceQuestion') {
            return 0;
        }
        return this.Question.scoreWeightedMultipleChoiceAnswer(this.sectionQuestion, ignoreForcedScore);
    };

    scoreMultipleChoiceAnswer = (ignoreForcedScore: boolean) => {
        if (this.sectionQuestion.question.type !== 'MultipleChoiceQuestion') {
            return 0;
        }
        return this.Question.scoreMultipleChoiceAnswer(this.sectionQuestion, ignoreForcedScore);
    };

    scoreClaimChoiceAnswer = (ignoreForcedScore: boolean) => {
        if (this.sectionQuestion.question.type !== 'ClaimChoiceQuestion') {
            return 0;
        }
        return this.Question.scoreClaimChoiceAnswer(this.sectionQuestion, ignoreForcedScore);
    };

    calculateWeightedMaxPoints = () => this.Question.calculateWeightedMaxPoints(this.sectionQuestion);

    calculateMultiChoiceMaxPoints = () =>
        Number.isInteger(this.sectionQuestion.maxScore)
            ? this.sectionQuestion.maxScore
            : this.sectionQuestion.maxScore.toFixed(2);

    getCorrectClaimChoiceOptionScore = () => this.Question.getCorrectClaimChoiceOptionScore(this.sectionQuestion);

    hasForcedScore = () => isNumber(this.sectionQuestion.forcedScore);
}
