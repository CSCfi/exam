// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { MathUnifiedDirective } from 'src/app/shared/math/math.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';

@Component({
    selector: 'xm-printed-essay',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './templates/essay.component.html',
    styleUrls: ['./print.shared.scss'],
    imports: [MathUnifiedDirective, TranslateModule],
})
export class PrintedEssayComponent {
    sectionQuestion = input.required<ExamSectionQuestion>();

    private CommonExam = inject(CommonExamService);

    getScore = () => {
        const sq = this.sectionQuestion();
        if (!sq.essayAnswer) {
            return 0;
        }
        return sq.essayAnswer.evaluatedScore || 0;
    };

    getWordCount = () => {
        const sq = this.sectionQuestion();
        if (!sq.essayAnswer?.answer) {
            return 0;
        }
        return this.CommonExam.countWords(sq.essayAnswer.answer);
    };

    getCharacterCount = () => {
        const sq = this.sectionQuestion();
        if (!sq.essayAnswer?.answer) {
            return 0;
        }
        return this.CommonExam.countCharacters(sq.essayAnswer.answer);
    };
}
