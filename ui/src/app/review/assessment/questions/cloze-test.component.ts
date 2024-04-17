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
import { NgStyle, UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';
import type { ExamParticipation, ExamSectionQuestion } from '../../../exam/exam.model';
import { AttachmentService } from '../../../shared/attachment/attachment.service';
import { MathJaxDirective } from '../../../shared/math/math-jax.directive';
import { FixedPrecisionValidatorDirective } from '../../../shared/validation/fixed-precision.directive';
import { AssessmentService } from '../assessment.service';

@Component({
    selector: 'xm-r-cloze-test',
    templateUrl: './cloze-test.component.html',
    standalone: true,
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

    constructor(
        private route: ActivatedRoute,
        private translate: TranslateService,
        private toast: ToastrService,
        private Assessment: AssessmentService,
        private Attachment: AttachmentService,
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
