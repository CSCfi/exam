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
import { Component, Input } from '@angular/core';

import { AttachmentService } from '../../utility/attachment/attachment.service';
import { Examination, ExaminationQuestion, ExaminationService } from '../examination.service';

import type { QuestionBase } from '../../utility/forms/questionTypes';
@Component({
    selector: 'examination-question',
    templateUrl: './examinationQuestion.component.html',
})
export class ExaminationQuestionComponent {
    @Input() exam: Examination;
    @Input() sq: ExaminationQuestion;
    @Input() isPreview: boolean;
    @Input() isCollaborative: boolean;

    clozeTestFormQuestions: QuestionBase<string>[] = [];
    expanded = true;

    constructor(private Examination: ExaminationService, private Attachment: AttachmentService) {}

    ngOnInit() {
        this.sq.expanded = true;
        const answerData = this.sq.clozeTestAnswer;
        if (this.sq.question.type === 'ClozeTestQuestion' && answerData) {
            this.clozeTestFormQuestions = this.Examination.parseClozeTestQuestion(answerData);
            //answerData.answer = JSON.parse(answerData.answer);
        }
    }

    answered = (event: { payload: { id: string; answer: string }[] }) => {
        if (this.sq.clozeTestAnswer) {
            const dictionary = Object.assign({}, ...event.payload.map((x) => ({ [x.id]: x.answer })));
            this.sq.clozeTestAnswer.answer = JSON.stringify(dictionary);
        }
    };

    downloadQuestionAttachment = () => {
        if (this.exam.external) {
            this.Attachment.downloadExternalQuestionAttachment(this.exam, this.sq);
        } else if (this.isCollaborative) {
            this.Attachment.downloadCollaborativeQuestionAttachment(this.exam.id, this.sq);
        } else {
            this.Attachment.downloadQuestionAttachment(this.sq.question);
        }
    };

    isAnswered = () => this.Examination.isAnswered(this.sq);
}
