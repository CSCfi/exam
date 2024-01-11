/*
 * Copyright (c) 2017 Exam Consortium
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
import { UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { AttachmentService } from '../../../shared/attachment/attachment.service';
import { MathJaxDirective } from '../../../shared/math/math-jax.directive';
import type { ReviewQuestion } from '../../review.model';

@Component({
    selector: 'xm-essay-answer',
    templateUrl: './essay-answer.component.html',
    standalone: true,
    imports: [RouterLink, MathJaxDirective, FormsModule, UpperCasePipe, TranslateModule],
})
export class EssayAnswerComponent implements OnInit {
    @Input() answer!: ReviewQuestion;
    @Input() editable = false;
    @Input() action = '';
    @Output() selected = new EventEmitter<ReviewQuestion>();

    name = '';

    constructor(
        private CommonExam: CommonExamService,
        private Attachment: AttachmentService,
    ) {}

    ngOnInit() {
        this.name = this.answer.examSection.exam.creator
            ? `${this.answer.examSection.exam.creator.lastName} ${this.answer.examSection.exam.creator.firstName}`
            : this.answer.examSection.exam.id.toString();
        this.answer.expanded = true;
        this.answer.essayAnswer = this.answer.essayAnswer || {};
        this.answer.essayAnswer.temporaryScore = this.answer.essayAnswer.evaluatedScore;
    }

    getWordCount = () => this.CommonExam.countWords(this.answer.essayAnswer.answer);

    getCharacterCount = () => this.CommonExam.countCharacters(this.answer.essayAnswer.answer);

    saveScore = () => {
        this.selected.emit(this.answer);
        this.answer.selected = false;
    };

    isAssessed = () => this.answer.essayAnswer.temporaryScore !== null && this.answer.essayAnswer.temporaryScore >= 0;

    displayMaxScore = () => (this.answer.evaluationType === 'Points' ? this.answer.maxScore : 1);

    downloadAttachment = () => this.Attachment.downloadQuestionAnswerAttachment(this.answer);
}
