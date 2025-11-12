// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { ReviewQuestion } from 'src/app/review/review.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { MathJaxDirective } from 'src/app/shared/math/mathjax.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';

@Component({
    selector: 'xm-essay-answer',
    templateUrl: './essay-answer.component.html',
    imports: [RouterLink, MathJaxDirective, FormsModule, UpperCasePipe, NgbCollapse, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EssayAnswerComponent {
    answer = input.required<ReviewQuestion>();
    editable = input(false);
    action = input('');
    selected = output<ReviewQuestion>();

    name = computed(() => {
        const currentAnswer = this.answer();
        return currentAnswer.examSection.exam.creator
            ? `${currentAnswer.examSection.exam.creator.lastName} ${currentAnswer.examSection.exam.creator.firstName}`
            : currentAnswer.examSection.exam.id.toString();
    });

    private CommonExam = inject(CommonExamService);
    private Attachment = inject(AttachmentService);
    private initialized = false;

    constructor() {
        effect(() => {
            // Initialize answer properties once when answer input is first set
            if (!this.initialized) {
                this.initializeAnswer();
                this.initialized = true;
            }
        });
    }

    getWordCount() {
        return this.CommonExam.countWords(this.answer().essayAnswer.answer);
    }

    getCharacterCount() {
        return this.CommonExam.countCharacters(this.answer().essayAnswer.answer);
    }

    saveScore() {
        this.selected.emit(this.answer());
        this.answer().selected = false;
    }

    isAssessed() {
        const currentAnswer = this.answer();
        return currentAnswer.essayAnswer.temporaryScore !== null && currentAnswer.essayAnswer.temporaryScore >= 0;
    }

    displayMaxScore() {
        const currentAnswer = this.answer();
        return currentAnswer.evaluationType === 'Points' ? currentAnswer.maxScore : 1;
    }

    downloadAttachment() {
        this.Attachment.downloadQuestionAnswerAttachment(this.answer());
    }

    toggleExpanded() {
        const currentAnswer = this.answer();
        currentAnswer.expanded = !currentAnswer.expanded;
    }

    private initializeAnswer() {
        const answer = this.answer();
        // Initialize expanded state if not set
        if (answer.expanded === undefined) {
            answer.expanded = true;
        }
        // Ensure essayAnswer object exists
        answer.essayAnswer = answer.essayAnswer || {};
        // Initialize temporaryScore from evaluatedScore if not already set
        if (answer.essayAnswer.temporaryScore === undefined) {
            answer.essayAnswer.temporaryScore = answer.essayAnswer.evaluatedScore;
        }
    }
}
