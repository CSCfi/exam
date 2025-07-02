// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';

@Component({
    selector: 'xm-printed-essay',
    templateUrl: './templates/essay.component.html',
    styleUrls: ['./print.shared.scss'],
    imports: [MathJaxDirective, TranslateModule],
})
export class PrintedEssayComponent {
    @Input() sectionQuestion!: ExamSectionQuestion;

    constructor(private CommonExam: CommonExamService) {}

    getScore = () => {
        if (!this.sectionQuestion.essayAnswer) {
            return 0;
        }
        return this.sectionQuestion.essayAnswer.evaluatedScore || 0;
    };

    getWordCount = () => {
        if (!this.sectionQuestion.essayAnswer?.answer) {
            return 0;
        }
        return this.CommonExam.countWords(this.sectionQuestion.essayAnswer.answer);
    };

    getCharacterCount = () => {
        if (!this.sectionQuestion.essayAnswer?.answer) {
            return 0;
        }
        return this.CommonExam.countCharacters(this.sectionQuestion.essayAnswer.answer);
    };
}
