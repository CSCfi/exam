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
import { NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamSectionQuestion } from 'src/app/exam/exam.model';
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
