// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { MathDirective } from 'src/app/shared/math/math.directive';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';

@Component({
    selector: 'xm-printed-multi-choice',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './templates/multi-choice.component.html',
    styleUrls: ['./print.shared.scss'],
    imports: [MathDirective, TranslateModule],
})
export class PrintedMultiChoiceComponent {
    readonly sectionQuestion = input.required<ExamSectionQuestion>();

    private readonly QuestionScore = inject(QuestionScoringService);

    scoreWeightedMultipleChoiceAnswer = (ignoreForcedScore: boolean) => {
        const sq = this.sectionQuestion();
        if (sq.question.type !== 'WeightedMultipleChoiceQuestion') {
            return 0;
        }
        return this.QuestionScore.scoreWeightedMultipleChoiceAnswer(sq, ignoreForcedScore);
    };

    scoreMultipleChoiceAnswer = (ignoreForcedScore: boolean) => {
        const sq = this.sectionQuestion();
        if (sq.question.type !== 'MultipleChoiceQuestion') {
            return 0;
        }
        return this.QuestionScore.scoreMultipleChoiceAnswer(sq, ignoreForcedScore);
    };

    scoreClaimChoiceAnswer = (ignoreForcedScore: boolean) => {
        const sq = this.sectionQuestion();
        if (sq.question.type !== 'ClaimChoiceQuestion') {
            return 0;
        }
        return this.QuestionScore.scoreClaimChoiceAnswer(sq, ignoreForcedScore);
    };

    calculateWeightedMaxPoints = () => this.QuestionScore.calculateWeightedMaxPoints(this.sectionQuestion());

    calculateMultiChoiceMaxPoints = () => {
        const sq = this.sectionQuestion();
        return Number.isInteger(sq.maxScore) ? sq.maxScore : sq.maxScore.toFixed(2);
    };

    getCorrectClaimChoiceOptionScore = () =>
        this.QuestionScore.getCorrectClaimChoiceOptionScore(this.sectionQuestion());

    hasForcedScore = () => isNumber(this.sectionQuestion().forcedScore);
}
