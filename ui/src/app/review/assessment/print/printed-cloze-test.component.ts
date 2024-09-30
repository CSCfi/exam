// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';

@Component({
    selector: 'xm-printed-cloze-test',
    templateUrl: './templates/cloze-test.component.html',
    styleUrls: ['./print.shared.scss'],
    standalone: true,
    imports: [MathJaxDirective, NgStyle, TranslateModule],
})
export class PrintedClozeTestComponent {
    @Input() sectionQuestion!: ExamSectionQuestion;

    hasForcedScore = () => isNumber(this.sectionQuestion.forcedScore);

    displayAchievedScore = () => {
        const max = this.sectionQuestion.maxScore;
        if (this.sectionQuestion.clozeTestAnswer) {
            const score = this.sectionQuestion.clozeTestAnswer.score;
            if (!score) return 0;
            return ((score.correctAnswers * max) / (score.correctAnswers + score.incorrectAnswers)).toFixed(2);
        }
        return 0;
    };
}
