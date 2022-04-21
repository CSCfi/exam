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
import { QuestionService } from '../../../question/question.service';
import { AttachmentService } from '../../../shared/attachment/attachment.service';
import { AssessmentService } from '../assessment.service';

@Component({
    selector: 'xm-r-multi-choice-question',
    templateUrl: './multi-choice-question.component.html',
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

    constructor(
        private routing: UIRouterGlobals,
        private translate: TranslateService,
        private toast: ToastrService,
        private Assessment: AssessmentService,
        private Attachment: AttachmentService,
        private Question: QuestionService,
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
        if (this.sectionQuestion.forcedScore) {
            this.scoreValue = this.sectionQuestion.forcedScore;
        }
    }

    hasForcedScore = () => isNumber(this.sectionQuestion.forcedScore);

    scoreWeightedMultipleChoiceAnswer = (ignoreForcedScore: boolean) => {
        if (this.sectionQuestion.question.type !== 'WeightedMultipleChoiceQuestion') {
            return 0;
        }
        return this.Question.scoreWeightedMultipleChoiceAnswer(this.sectionQuestion, ignoreForcedScore);
    };

    scoreMultipleChoiceAnswer = (ignoreForcedScore: boolean) => {
        if (this.sectionQuestion.question.type !== 'MultipleChoiceQuestion') {
            return 0;
        }
        return this.Question.scoreMultipleChoiceAnswer(this.sectionQuestion, ignoreForcedScore);
    };

    scoreClaimChoiceAnswer = (ignoreForcedScore: boolean) => {
        if (this.sectionQuestion.question.type !== 'ClaimChoiceQuestion') {
            return 0;
        }
        return this.Question.scoreClaimChoiceAnswer(this.sectionQuestion, ignoreForcedScore);
    };

    displayMaxScore = () =>
        isInteger(this.sectionQuestion.maxScore)
            ? this.sectionQuestion.maxScore
            : this.sectionQuestion.maxScore.toFixed(2);

    calculateWeightedMaxPoints = () => this.Question.calculateWeightedMaxPoints(this.sectionQuestion);

    getMinimumOptionScore = () => this.Question.getMinimumOptionScore(this.sectionQuestion);

    getCorrectClaimChoiceOptionScore = () => this.Question.getCorrectClaimChoiceOptionScore(this.sectionQuestion);

    insertForcedScore = () => {
        if (this.collaborative && this.participation._rev) {
            this.Assessment.saveCollaborativeForcedScore$(
                this.sectionQuestion,
                this.routing.params.id,
                this.routing.params.ref,
                this.participation._rev,
            ).subscribe({
                next: (resp) => {
                    this.toast.info(this.translate.instant('sitnet_graded'));
                    this.scored.emit(resp.rev);
                },
                error: (err) => this.toast.error(err.data),
            });
        } else {
            this.Assessment.saveForcedScore(this.sectionQuestion).subscribe({
                next: () => this.toast.info(this.translate.instant('sitnet_graded')),
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
