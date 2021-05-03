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
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import * as _ from 'lodash';
import * as toast from 'toastr';

import { ExamParticipation, ExamSectionQuestion } from '../../../exam/exam.model';
import { QuestionService } from '../../../question/question.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { AssessmentService } from '../assessment.service';

@Component({
    selector: 'r-multi-choice-question',
    templateUrl: './multiChoiceQuestion.component.html',
})
export class MultiChoiceQuestionComponent {
    @Input() sectionQuestion: ExamSectionQuestion;
    @Input() participation: ExamParticipation;
    @Input() isScorable: boolean;
    @Input() collaborative: boolean;
    @Output() onScore = new EventEmitter<string>();
    @ViewChild('forcedPoints', { static: false }) form: NgForm;

    reviewExpanded = true;
    _score: number | null = null;

    constructor(
        private state: StateService,
        private translate: TranslateService,
        private Assessment: AssessmentService,
        private Attachment: AttachmentService,
        private Question: QuestionService,
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
        if (this.form.valid) {
            this.sectionQuestion.forcedScore = value;
        } else {
            this.sectionQuestion.forcedScore = null;
        }
    }

    hasForcedScore = () => _.isNumber(this.sectionQuestion.forcedScore);

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
        _.isInteger(this.sectionQuestion.maxScore)
            ? this.sectionQuestion.maxScore
            : this.sectionQuestion.maxScore.toFixed(2);

    calculateMaxPoints = () => this.Question.calculateMaxPoints(this.sectionQuestion);

    getMinimumOptionScore = () => this.Question.getMinimumOptionScore(this.sectionQuestion);

    getCorrectClaimChoiceOptionScore = () => this.Question.getCorrectClaimChoiceOptionScore(this.sectionQuestion);

    insertForcedScore = () => {
        if (this.collaborative && this.participation._rev) {
            this.Assessment.saveCollaborativeForcedScore(
                this.sectionQuestion,
                this.state.params.id,
                this.state.params.ref,
                this.participation._rev,
            ).subscribe(
                (resp) => {
                    toast.info(this.translate.instant('sitnet_graded'));
                    this.onScore.emit(resp.rev);
                },
                (err) => toast.error(err.data),
            );
        } else {
            this.Assessment.saveForcedScore(this.sectionQuestion).subscribe(
                () => toast.info(this.translate.instant('sitnet_graded')),
                (err) => toast.error(err.data),
            );
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
