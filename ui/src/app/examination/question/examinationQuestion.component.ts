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
import { ChangeDetectorRef, Component, Input } from '@angular/core';

import { AttachmentService } from '../../utility/attachment/attachment.service';
import { ExaminationService } from '../examination.service';

import type { Examination, ExaminationQuestion } from '../examination.service';
import type { AfterViewInit } from '@angular/core';

@Component({
    selector: 'examination-question',
    templateUrl: './examinationQuestion.component.html',
})
export class ExaminationQuestionComponent implements AfterViewInit {
    @Input() exam: Examination;
    @Input() sq: ExaminationQuestion;
    @Input() isPreview: boolean;
    @Input() isCollaborative: boolean;

    clozeAnswer: { [key: string]: string } = {};
    expanded = true;

    constructor(
        private cdr: ChangeDetectorRef,
        private Examination: ExaminationService,
        private Attachment: AttachmentService,
    ) {}

    ngOnInit() {
        this.sq.expanded = true;
        if (this.sq.question.type === 'ClozeTestQuestion' && this.sq.clozeTestAnswer?.answer) {
            const { answer } = this.sq.clozeTestAnswer;
            this.clozeAnswer = JSON.parse(answer);
        }
    }

    ngAfterViewInit() {
        this.cdr.detectChanges();
    }

    answered = ({ id, value }: { id: string; value: string }) => {
        if (this.sq.clozeTestAnswer) {
            this.clozeAnswer = {
                ...this.clozeAnswer,
                [id]: value,
            };
            this.sq.clozeTestAnswer.answer = JSON.stringify(this.clozeAnswer);
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
