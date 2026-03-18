// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { disabled, form, FormField, min, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { ReviewQuestion } from 'src/app/review/review.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { MathDirective } from 'src/app/shared/math/math.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';

@Component({
    selector: 'xm-essay-answer',
    templateUrl: './essay-answer.component.html',
    imports: [RouterLink, MathDirective, FormsModule, FormField, UpperCasePipe, NgbCollapse, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EssayAnswerComponent {
    readonly answer = input.required<ReviewQuestion>();
    readonly editable = input(false);
    readonly action = input('');
    readonly selected = output<ReviewQuestion>();

    readonly name = computed(() => {
        const currentAnswer = this.answer();
        return currentAnswer.examSection.exam.creator
            ? `${currentAnswer.examSection.exam.creator.lastName} ${currentAnswer.examSection.exam.creator.firstName}`
            : currentAnswer.examSection.exam.id.toString();
    });
    readonly pointsFormModel = signal<{ score: number | null }>({ score: null });
    readonly pointsForm = form(this.pointsFormModel, (path) => {
        required(path.score);
        min(path.score, 0);
        disabled(path.score, () => !this.editable());
    });
    readonly isPointsScoreValid = computed(() => {
        const score = this.pointsForm.score().value();
        const max = this.answer().maxScore;
        if (score == null || Number.isNaN(score)) return false;
        return score >= 0 && score <= max;
    });

    private readonly CommonExam = inject(CommonExamService);
    private readonly Attachment = inject(AttachmentService);

    constructor() {
        toObservable(this.answer)
            .pipe(takeUntilDestroyed())
            .subscribe((answer) => {
                if (answer.expanded === undefined) answer.expanded = true;
                answer.essayAnswer = answer.essayAnswer || {};
                if (answer.essayAnswer.temporaryScore === undefined) {
                    answer.essayAnswer.temporaryScore = answer.essayAnswer.evaluatedScore;
                }
                this.pointsForm.score().value.set(answer.essayAnswer.temporaryScore ?? null);
            });

        toObservable(this.pointsForm.score().value)
            .pipe(takeUntilDestroyed())
            .subscribe((score) => {
                if (this.answer().evaluationType === 'Points' && score != null) {
                    this.answer().essayAnswer.temporaryScore = score;
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
}
