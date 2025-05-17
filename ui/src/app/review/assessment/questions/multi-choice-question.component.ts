// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgStyle, UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';
import { ClaimChoiceAnswerComponent } from './claim-choice-answer.component';
import { MultiChoiceAnswerComponent } from './multi-choice-answer.component';
import { WeightedMultiChoiceAnswerComponent } from './weighted-multi-choice-answer.component';

@Component({
    selector: 'xm-r-multi-choice-question',
    templateUrl: './multi-choice-question.component.html',
    styleUrls: ['../assessment.shared.scss'],
    standalone: true,
    imports: [
        MathJaxDirective,
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
    @Input() sectionQuestion!: ExamSectionQuestion;
    @Input() participation!: ExamParticipation;
    @Input() isScorable = false;
    @Input() collaborative = false;
    @Output() scored = new EventEmitter<string>();
    @ViewChild('forcedPoints', { static: false }) form?: NgForm;

    reviewExpanded = true;
    _score: number | null = null;
    id = 0;
    ref = '';

    constructor(
        private route: ActivatedRoute,
        private translate: TranslateService,
        private toast: ToastrService,
        private Assessment: AssessmentService,
        private Attachment: AttachmentService,
        private QuestionScore: QuestionScoringService,
    ) {}

    get scoreValue(): number | null {
        return this._score;
    }

    set scoreValue(value: number | null) {
        this._score = value;
        if (this.form?.valid) {
            this.sectionQuestion.forcedScore = value;
        }
    }

    ngOnInit() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
        if (this.sectionQuestion.forcedScore) {
            this.scoreValue = this.sectionQuestion.forcedScore;
        }
    }

    hasForcedScore = () => isNumber(this.sectionQuestion.forcedScore);

    scoreWeightedMultipleChoiceAnswer = (ignoreForcedScore: boolean) => {
        if (this.sectionQuestion.question.type !== 'WeightedMultipleChoiceQuestion') {
            return 0;
        }
        return this.QuestionScore.scoreWeightedMultipleChoiceAnswer(this.sectionQuestion, ignoreForcedScore);
    };

    scoreMultipleChoiceAnswer = (ignoreForcedScore: boolean) => {
        if (this.sectionQuestion.question.type !== 'MultipleChoiceQuestion') {
            return 0;
        }
        return this.QuestionScore.scoreMultipleChoiceAnswer(this.sectionQuestion, ignoreForcedScore);
    };

    scoreClaimChoiceAnswer = (ignoreForcedScore: boolean) => {
        if (this.sectionQuestion.question.type !== 'ClaimChoiceQuestion') {
            return 0;
        }
        return this.QuestionScore.scoreClaimChoiceAnswer(this.sectionQuestion, ignoreForcedScore);
    };

    displayMaxScore = () =>
        !this.sectionQuestion.maxScore || Number.isInteger(this.sectionQuestion.maxScore)
            ? this.sectionQuestion.maxScore
            : this.sectionQuestion.maxScore.toFixed(2);

    calculateWeightedMaxPoints = () => this.QuestionScore.calculateWeightedMaxPoints(this.sectionQuestion);

    getMinimumOptionScore = () => this.QuestionScore.getMinimumOptionScore(this.sectionQuestion);

    getCorrectClaimChoiceOptionScore = () => this.QuestionScore.getCorrectClaimChoiceOptionScore(this.sectionQuestion);

    insertForcedScore = () => {
        if (this.collaborative && this.participation._rev) {
            this.Assessment.saveCollaborativeForcedScore$(
                this.sectionQuestion,
                this.id,
                this.ref,
                this.participation._rev,
            ).subscribe({
                next: (resp) => {
                    this.toast.info(this.translate.instant('i18n_graded'));
                    this.scored.emit(resp.rev);
                },
                error: (err) => this.toast.error(err.data),
            });
        } else {
            this.Assessment.saveForcedScore(this.sectionQuestion).subscribe({
                next: () => this.toast.info(this.translate.instant('i18n_graded')),
                error: (err) => this.toast.error(err.data),
            });
        }
    };

    downloadQuestionAttachment = () => {
        if (this.collaborative && this.sectionQuestion.question.attachment?.externalId) {
            return this.Attachment.downloadCollaborativeAttachment(
                this.sectionQuestion.question.attachment.externalId,
                this.sectionQuestion.question.attachment.fileName,
            );
        }
        return this.Attachment.downloadQuestionAttachment(this.sectionQuestion.question);
    };
}
