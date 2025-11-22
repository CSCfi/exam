// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgStyle, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { MathUnifiedDirective } from 'src/app/shared/math/math.directive';
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
        MathUnifiedDirective,
        NgStyle,
        MultiChoiceAnswerComponent,
        WeightedMultiChoiceAnswerComponent,
        ClaimChoiceAnswerComponent,
        FormsModule,
        FixedPrecisionValidatorDirective,
        UpperCasePipe,
        TranslateModule,
    ],
})
export class MultiChoiceQuestionComponent implements OnInit {
    @ViewChild('forcedPoints', { static: false }) form?: NgForm;

    sectionQuestion = input.required<ExamSectionQuestion>();
    participation = input.required<ExamParticipation>();
    isScorable = input(false);
    collaborative = input(false);
    scored = output<string>();

    reviewExpanded = signal(true);
    _score = signal<number | null>(null);
    id = 0;
    ref = '';

    private route = inject(ActivatedRoute);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Assessment = inject(AssessmentService);
    private Attachment = inject(AttachmentService);
    private QuestionScore = inject(QuestionScoringService);

    get scoreValue(): number | null {
        return this._score();
    }

    set scoreValue(value: number | null) {
        this._score.set(value);
        if (this.form?.valid) {
            this.sectionQuestion().forcedScore = value;
        }
    }

    ngOnInit() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
        const sq = this.sectionQuestion();
        if (sq.forcedScore) {
            this.scoreValue = sq.forcedScore;
        }
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
                next: () => this.toast.info(this.translate.instant('i18n_graded')),
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
