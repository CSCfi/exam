/*
 * Copyright (c) 2019 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

import { ExamSectionQuestion, ExamSectionQuestionOption } from '../../../exam/exam.model';
import { QuestionService } from '../../../question/question.service';

@Component({
    selector: 'r-claim-choice-answer',
    template: require('./claimChoiceAnswer.component.html'),
})
export class ClaimChoiceAnswerComponent {
    @Input() sectionQuestion: ExamSectionQuestion;

    reviewExpanded = true;

    constructor(private Question: QuestionService) {}

    determineClaimOptionType = (option: ExamSectionQuestionOption) =>
        this.Question.determineClaimOptionTypeForExamQuestionOption(option);

    getSelectedOptionClass = (option: ExamSectionQuestionOption) => {
        if (!option.answered) {
            return 'exam-not-answered';
        }
        switch (this.determineClaimOptionType(option)) {
            case 'CorrectOption':
                return 'exam-answered-correct';
            case 'IncorrectOption':
                return 'exam-answered-wrong';
            case 'SkipOption':
                return 'exam-answered-skip';
            default:
                return 'exam-not-answered';
        }
    };
}
