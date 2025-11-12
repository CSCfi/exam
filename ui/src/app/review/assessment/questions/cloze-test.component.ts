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
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { MathJaxDirective } from 'src/app/shared/math/mathjax.directive';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';

@Component({
    selector: 'xm-r-cloze-test',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './cloze-test.component.html',
    imports: [NgStyle, MathJaxDirective, FormsModule, FixedPrecisionValidatorDirective, UpperCasePipe, TranslateModule],
    styleUrls: ['../assessment.shared.scss'],
})
export class ClozeTestComponent implements OnInit {
    @ViewChild('forcedPoints', { static: false }) form?: NgForm;

    participation = input.required<ExamParticipation>();
    sectionQuestion = input.required<ExamSectionQuestion>();
    isScorable = input(false);
    collaborative = input(false);
    scored = output<string>();

    id = 0;
    ref = '';
    reviewExpanded = signal(true);
    _score = signal<number | null>(null);

    private route = inject(ActivatedRoute);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Assessment = inject(AssessmentService);
    private Attachment = inject(AttachmentService);

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

    displayAchievedScore = () => {
        const sq = this.sectionQuestion();
        const max = sq.maxScore;
        const score = sq.clozeTestAnswer?.score;
        if (score) {
            const value = (score.correctAnswers * max) / (score.correctAnswers + score.incorrectAnswers);
            return Number.isInteger(value) ? value : value.toFixed(2);
        }
        return 0;
    };

    insertForcedScore = () => {
        const sq = this.sectionQuestion();
        const participationValue = this.participation();
        if (this.collaborative()) {
            this.Assessment.saveCollaborativeForcedScore$(
                sq,
                this.id,
                this.ref,
                participationValue._rev as string,
            ).subscribe((resp) => {
                this.toast.info(this.translate.instant('i18n_graded'));
                this.scored.emit(resp.rev);
            });
        } else {
            this.Assessment.saveForcedScore(sq).subscribe(() => this.toast.info(this.translate.instant('i18n_graded')));
        }
    };
}
