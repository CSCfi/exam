/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */

import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Exam, ExamSectionQuestion } from 'src/app/exam/exam.model';
import { AnsweredQuestion, AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';

@Component({
    selector: 'xm-exam-answers-dialog',
    templateUrl: './exam-answers-dialog.component.html',
})
export class ExamAnswersDialogComponent implements OnInit {
    @Input() exam!: Exam;
    @Input() participationTime = '';
    @Input() participationDuration: number | string = 0;

    constructor(
        public activeModal: NgbActiveModal,
        private CommonExam: CommonExamService,
        private Attachment: AttachmentService,
    ) {}

    ngOnInit() {
        this.exam.examSections.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    }

    downloadAttachment = (answer: ExamSectionQuestion) =>
        this.Attachment.downloadQuestionAnswerAttachment(answer as AnsweredQuestion);

    countWords = (answer: ExamSectionQuestion) => this.CommonExam.countWords(answer.essayAnswer?.answer);
    countCharacters = (answer: ExamSectionQuestion) => this.CommonExam.countCharacters(answer.essayAnswer?.answer);
    getAnsweredOptions = (answer: ExamSectionQuestion) => answer.options.filter((o) => o.answered);
    isMultiChoice = (answer: ExamSectionQuestion) =>
        ['WeightedMultipleChoiceQuestion', 'MultipleChoiceQuestion', 'ClaimChoiceQuestion'].indexOf(
            answer.question.type,
        ) > -1;
}
