// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, NgStyle } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { MathJaxDirective } from 'src/app/shared/math/mathjax.directive';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';

@Component({
    selector: 'xm-printed-multi-choice',
    templateUrl: './templates/multi-choice.component.html',
    styleUrls: ['./print.shared.scss'],
    imports: [MathJaxDirective, NgClass, NgStyle, TranslateModule],
})
export class PrintedMultiChoiceComponent {
    @Input() sectionQuestion!: ExamSectionQuestion;

    private QuestionScore = inject(QuestionScoringService);

    scoreWeightedMultipleChoiceAnswer = (ignoreForcedScore: boolean) => {
        if (this.sectionQuestion.question.type !== 'WeightedMultipleChoiceQuestion') {
            return 0;
        }
        return this.QuestionScore.scoreWeightedMultipleChoiceAnswer(this.sectionQuestion, ignoreForcedScore);
    };

    scoreMultipleChoiceAnswer = (ignoreForcedScore: boolean) => {
        if (this.sectionQuestion.question.type !== 'MultipleChoiceQuestion') {
            return 0;
        }
        return this.QuestionScore.scoreMultipleChoiceAnswer(this.sectionQuestion, ignoreForcedScore);
    };

    scoreClaimChoiceAnswer = (ignoreForcedScore: boolean) => {
        if (this.sectionQuestion.question.type !== 'ClaimChoiceQuestion') {
            return 0;
        }
        return this.QuestionScore.scoreClaimChoiceAnswer(this.sectionQuestion, ignoreForcedScore);
    };

    calculateWeightedMaxPoints = () => this.QuestionScore.calculateWeightedMaxPoints(this.sectionQuestion);

    calculateMultiChoiceMaxPoints = () =>
        Number.isInteger(this.sectionQuestion.maxScore)
            ? this.sectionQuestion.maxScore
            : this.sectionQuestion.maxScore.toFixed(2);

    getCorrectClaimChoiceOptionScore = () => this.QuestionScore.getCorrectClaimChoiceOptionScore(this.sectionQuestion);

    hasForcedScore = () => isNumber(this.sectionQuestion.forcedScore);
}
