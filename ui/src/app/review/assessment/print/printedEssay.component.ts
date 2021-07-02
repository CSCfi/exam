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
import { Component, Input } from '@angular/core';

import { ExamSectionQuestion } from '../../../exam/exam.model';
import { AssessmentService } from '../assessment.service';

@Component({
    selector: 'printed-essay',
    templateUrl: './templates/essay.component.html',
})
export class PrintedEssayComponent {
    @Input() sectionQuestion: ExamSectionQuestion;

    constructor(private Assessment: AssessmentService) {}

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
        return this.Assessment.countWords(this.sectionQuestion.essayAnswer.answer);
    };

    getCharacterCount = () => {
        if (!this.sectionQuestion.essayAnswer?.answer) {
            return 0;
        }
        return this.Assessment.countCharacters(this.sectionQuestion.essayAnswer.answer);
    };
}
