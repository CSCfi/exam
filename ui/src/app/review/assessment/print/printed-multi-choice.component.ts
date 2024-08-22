// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ExamSectionQuestion } from 'src/app/question/question.model';
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

    calculateWeightedMaxPoints = () => this.Question.calculateWeightedMaxPoints(this.sectionQuestion.options);

    calculateMultiChoiceMaxPoints = () =>
        Number.isInteger(this.sectionQuestion.maxScore)
            ? this.sectionQuestion.maxScore
            : this.sectionQuestion.maxScore.toFixed(2);

    getCorrectClaimChoiceOptionScore = () => this.Question.getCorrectClaimChoiceOptionScore(this.sectionQuestion);

    hasForcedScore = () => isNumber(this.sectionQuestion.forcedScore);
}
