// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgStyle, UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild, inject } from '@angular/core';
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
    templateUrl: './cloze-test.component.html',
    imports: [NgStyle, MathJaxDirective, FormsModule, FixedPrecisionValidatorDirective, UpperCasePipe, TranslateModule],
    styleUrls: ['../assessment.shared.scss'],
})
export class ClozeTestComponent implements OnInit {
    @Input() participation!: ExamParticipation;
    @Input() sectionQuestion!: ExamSectionQuestion;
    @Input() isScorable = false;
    @Input() collaborative = false;
    @Output() scored = new EventEmitter<string>();
    @ViewChild('forcedPoints', { static: false }) form?: NgForm;

    id = 0;
    ref = '';
    reviewExpanded = true;
    _score: number | null = null;

    private route = inject(ActivatedRoute);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Assessment = inject(AssessmentService);
    private Attachment = inject(AttachmentService);

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

    downloadQuestionAttachment = () => {
        if (this.collaborative && this.sectionQuestion.question.attachment?.externalId) {
            return this.Attachment.downloadCollaborativeAttachment(
                this.sectionQuestion.question.attachment.externalId,
                this.sectionQuestion.question.attachment.fileName,
            );
        }
        return this.Attachment.downloadQuestionAttachment(this.sectionQuestion.question);
    };

    displayAchievedScore = () => {
        const max = this.sectionQuestion.maxScore;
        const score = this.sectionQuestion.clozeTestAnswer?.score;
        if (score) {
            const value = (score.correctAnswers * max) / (score.correctAnswers + score.incorrectAnswers);
            return Number.isInteger(value) ? value : value.toFixed(2);
        }
        return 0;
    };

    insertForcedScore = () =>
        this.collaborative
            ? this.Assessment.saveCollaborativeForcedScore$(
                  this.sectionQuestion,
                  this.id,
                  this.ref,
                  this.participation._rev as string,
              ).subscribe((resp) => {
                  this.toast.info(this.translate.instant('i18n_graded'));
                  this.scored.emit(resp.rev);
              })
            : this.Assessment.saveForcedScore(this.sectionQuestion).subscribe(() =>
                  this.toast.info(this.translate.instant('i18n_graded')),
              );
}
