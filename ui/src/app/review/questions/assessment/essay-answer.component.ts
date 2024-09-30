// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { ReviewQuestion } from 'src/app/review/review.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';

@Component({
    selector: 'xm-essay-answer',
    templateUrl: './essay-answer.component.html',
    standalone: true,
    imports: [RouterLink, MathJaxDirective, FormsModule, UpperCasePipe, NgbCollapse, TranslateModule],
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
