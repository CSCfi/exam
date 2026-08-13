// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { MathDirective } from 'src/app/shared/math/math.directive';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';

@Component({
    selector: 'xm-printed-cloze-test',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './templates/cloze-test.component.html',
    styleUrls: ['./print.shared.scss'],
    imports: [MathDirective, TranslateModule],
})
export class PrintedClozeTestComponent {
    readonly sectionQuestion = input.required<ExamSectionQuestion>();

    hasForcedScore = () => isNumber(this.sectionQuestion().forcedScore);

    displayAchievedScore = () => {
        const sq = this.sectionQuestion();
        const max = sq.maxScore;
        if (sq.clozeTestAnswer) {
            const score = sq.clozeTestAnswer.score;
            if (!score) return 0;
            return ((score.correctAnswers * max) / (score.correctAnswers + score.incorrectAnswers)).toFixed(2);
        }
        return 0;
    };
}
