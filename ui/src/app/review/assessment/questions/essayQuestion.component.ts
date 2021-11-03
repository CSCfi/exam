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
import * as toast from 'toastr';

import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { AssessmentService } from '../assessment.service';

import type { Exam, ExamParticipation, ExamSectionQuestion } from '../../../exam/exam.model';
import type { ExaminationQuestion } from '../../../examination/examination.model';
import type { ReviewQuestion } from '../../review.model';

@Component({
    selector: 'r-essay-question',
    templateUrl: './essayQuestion.component.html',
})
export class EssayQuestionComponent {
    @Input() participation!: ExamParticipation;
    @Input() exam!: Exam;
    @Input() sectionQuestion!: ExamSectionQuestion;
    @Input() isScorable = false;
    @Input() collaborative = false;
    @Output() onScore = new EventEmitter<string>();
    @ViewChild('essayPoints', { static: false }) form?: NgForm;

    reviewExpanded = true;
    _score: number | undefined = undefined;

    constructor(
        private state: StateService,
        private translate: TranslateService,
        private Assessment: AssessmentService,
        private Attachment: AttachmentService,
    ) {}

    ngOnInit() {
        if (!this.sectionQuestion.essayAnswer) {
            this.sectionQuestion.essayAnswer = { id: 0 };
        }
        this.scoreValue = this.sectionQuestion.essayAnswer.evaluatedScore;
    }

    get scoreValue(): number | undefined {
        return this._score;
    }

    set scoreValue(value: number | undefined) {
        this._score = value;
        if (!this.form || this.form.valid) {
            this.sectionQuestion.essayAnswer = { ...this.sectionQuestion.essayAnswer, evaluatedScore: value };
        } else {
            this.sectionQuestion.essayAnswer = { ...this.sectionQuestion.essayAnswer, evaluatedScore: undefined };
        }
    }

    downloadQuestionAttachment = () => {
        if (this.collaborative && this.sectionQuestion.question.attachment?.externalId) {
            return this.Attachment.downloadCollaborativeAttachment(
                this.sectionQuestion.question.attachment.externalId,
                this.sectionQuestion.question.attachment.fileName,
            );
        }
        return this.Attachment.downloadQuestionAttachment(this.sectionQuestion.question);
    };

    downloadQuestionAnswerAttachment = () => {
        if (this.collaborative && this.sectionQuestion?.essayAnswer?.attachment?.externalId) {
            return this.Attachment.downloadCollaborativeAttachment(
                this.sectionQuestion.essayAnswer.attachment.externalId,
                this.sectionQuestion.essayAnswer.attachment.fileName,
            );
        }
        return this.Attachment.downloadQuestionAnswerAttachment(this.sectionQuestion as ReviewQuestion);
    };

    insertEssayScore = () => {
        if (this.collaborative) {
            return this.Assessment.saveCollaborativeEssayScore$(
                this.sectionQuestion as ExaminationQuestion,
                this.state.params.id,
                this.state.params.ref,
                this.participation._rev as string,
            ).subscribe((resp) => {
                toast.info(this.translate.instant('sitnet_graded'));
                this.onScore.emit(resp.rev);
            });
        } else {
            return this.Assessment.saveEssayScore$(this.sectionQuestion as ExaminationQuestion).subscribe(() => {
                toast.info(this.translate.instant('sitnet_graded')), this.onScore.emit();
            });
        }
    };

    getWordCount = () => {
        if (!this.sectionQuestion.essayAnswer?.answer) {
            return 0;
        }
        return this.Assessment.countWords(this.sectionQuestion.essayAnswer.answer);
    };

    getCharacterCount = () => {
        if (!this.sectionQuestion.essayAnswer?.answer) {
            return 0;
        }
        return this.Assessment.countCharacters(this.sectionQuestion.essayAnswer.answer);
    };
}
