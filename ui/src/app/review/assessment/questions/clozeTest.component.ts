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
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { UIRouterGlobals } from '@uirouter/core';
import { isInteger, isNumber } from 'lodash';
import { ToastrService } from 'ngx-toastr';
import type { ExamParticipation, ExamSectionQuestion } from '../../../exam/exam.model';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { AssessmentService } from '../assessment.service';

@Component({
    selector: 'r-cloze-test',
    templateUrl: './clozeTest.component.html',
})
export class ClozeTestComponent implements OnInit {
    @Input() participation!: ExamParticipation;
    @Input() sectionQuestion!: ExamSectionQuestion;
    @Input() isScorable = false;
    @Input() collaborative = false;
    @Output() scored = new EventEmitter<string>();
    @ViewChild('forcedPoints', { static: false }) form?: NgForm;

    reviewExpanded = true;
    _score: number | null = null;

    constructor(
        private routing: UIRouterGlobals,
        private translate: TranslateService,
        private toast: ToastrService,
        private Assessment: AssessmentService,
        private Attachment: AttachmentService,
    ) {}

    ngOnInit() {
        if (this.sectionQuestion.forcedScore) {
            this.scoreValue = this.sectionQuestion.forcedScore;
        }
    }

    get scoreValue(): number | null {
        return this._score;
    }

    set scoreValue(value: number | null) {
        this._score = value;
        if (this.form?.valid) {
            this.sectionQuestion.forcedScore = value;
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
            return isInteger(value) ? value : value.toFixed(2);
        }
        return 0;
    };

    insertForcedScore = () =>
        this.collaborative
            ? this.Assessment.saveCollaborativeForcedScore$(
                  this.sectionQuestion,
                  this.routing.params.id,
                  this.routing.params.ref,
                  this.participation._rev as string,
              ).subscribe((resp) => {
                  this.toast.info(this.translate.instant('sitnet_graded'));
                  this.scored.emit(resp.rev);
              })
            : this.Assessment.saveForcedScore(this.sectionQuestion).subscribe(() =>
                  this.toast.info(this.translate.instant('sitnet_graded')),
              );
}
