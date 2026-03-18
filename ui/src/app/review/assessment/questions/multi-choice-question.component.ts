// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { MathDirective } from 'src/app/shared/math/math.directive';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';
import { ClaimChoiceAnswerComponent } from './claim-choice-answer.component';
import { MultiChoiceAnswerComponent } from './multi-choice-answer.component';
import { WeightedMultiChoiceAnswerComponent } from './weighted-multi-choice-answer.component';

@Component({
    selector: 'xm-r-multi-choice-question',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './multi-choice-question.component.html',
    styleUrls: ['../assessment.shared.scss'],
    imports: [
        MathDirective,
        MultiChoiceAnswerComponent,
        WeightedMultiChoiceAnswerComponent,
        ClaimChoiceAnswerComponent,
        ReactiveFormsModule,
        FixedPrecisionValidatorDirective,
        UpperCasePipe,
        TranslateModule,
    ],
})
export class MultiChoiceQuestionComponent {
    readonly sectionQuestion = input.required<ExamSectionQuestion>();
    readonly participation = input.required<ExamParticipation>();
    readonly isScorable = input(false);
    readonly collaborative = input(false);
    readonly scored = output<string>();

    readonly reviewExpanded = signal(true);
    readonly scoreControl = new FormControl<number | null>(null);

    private readonly id: number;
    private readonly ref: string;

    private readonly route = inject(ActivatedRoute);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Assessment = inject(AssessmentService);
    private readonly Attachment = inject(AttachmentService);
    private readonly QuestionScore = inject(QuestionScoringService);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;

        toObservable(this.isScorable)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((scorable) => {
                if (scorable) {
                    this.scoreControl.enable({ emitEvent: false });
                } else {
                    this.scoreControl.disable({ emitEvent: false });
                }
            });

        toObservable(this.sectionQuestion)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((sq) => this.scoreControl.setValue(sq.forcedScore ?? null, { emitEvent: false }));

        this.scoreControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
            if (this.scoreControl.valid) {
                this.sectionQuestion().forcedScore = value;
            }
        });
    }

    hasForcedScore = () => isNumber(this.sectionQuestion().forcedScore);

    toggleReviewExpanded = () => this.reviewExpanded.update((v) => !v);

    scoreWeightedMultipleChoiceAnswer = (ignoreForcedScore: boolean) => {
        const sq = this.sectionQuestion();
        if (sq.question.type !== 'WeightedMultipleChoiceQuestion') {
            return 0;
        }
        return this.QuestionScore.scoreWeightedMultipleChoiceAnswer(sq, ignoreForcedScore);
    };

    scoreMultipleChoiceAnswer = (ignoreForcedScore: boolean) => {
        const sq = this.sectionQuestion();
        if (sq.question.type !== 'MultipleChoiceQuestion') {
            return 0;
        }
        return this.QuestionScore.scoreMultipleChoiceAnswer(sq, ignoreForcedScore);
    };

    scoreClaimChoiceAnswer = (ignoreForcedScore: boolean) => {
        const sq = this.sectionQuestion();
        if (sq.question.type !== 'ClaimChoiceQuestion') {
            return 0;
        }
        return this.QuestionScore.scoreClaimChoiceAnswer(sq, ignoreForcedScore);
    };

    displayMaxScore = () => {
        const sq = this.sectionQuestion();
        return !sq.maxScore || Number.isInteger(sq.maxScore) ? sq.maxScore : sq.maxScore.toFixed(2);
    };

    calculateWeightedMaxPoints = () => this.QuestionScore.calculateWeightedMaxPoints(this.sectionQuestion());

    getMinimumOptionScore = () => this.QuestionScore.getMinimumOptionScore(this.sectionQuestion());

    getCorrectClaimChoiceOptionScore = () =>
        this.QuestionScore.getCorrectClaimChoiceOptionScore(this.sectionQuestion());

    insertForcedScore = () => {
        const sq = this.sectionQuestion();
        const participationValue = this.participation();
        if (this.collaborative() && participationValue._rev) {
            this.Assessment.saveCollaborativeForcedScore$(sq, this.id, this.ref, participationValue._rev).subscribe({
                next: (resp) => {
                    this.toast.info(this.translate.instant('i18n_graded'));
                    this.scored.emit(resp.rev);
                },
                error: (err) => this.toast.error(err.data),
            });
        } else {
            this.Assessment.saveForcedScore(sq).subscribe({
                next: () => {
                    this.toast.info(this.translate.instant('i18n_graded'));
                    this.scored.emit('');
                },
                error: (err) => this.toast.error(err.data),
            });
        }
    };

    downloadQuestionAttachment = () => {
        const sq = this.sectionQuestion();
        if (this.collaborative() && sq.question.attachment?.externalId) {
            return this.Attachment.downloadCollaborativeAttachment(
                sq.question.attachment.externalId,
                sq.question.attachment.fileName,
            );
        }
        return this.Attachment.downloadQuestionAttachment(sq.question);
    };
}
