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
import type { AfterViewInit } from '@angular/core';
import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import type { EssayAnswer } from '../../exam/exam.model';
import { AttachmentService } from '../../shared/attachment/attachment.service';
import type { Examination, ExaminationQuestion } from '../examination.model';
import { ExaminationService } from '../examination.service';

type ClozeTestAnswer = { [key: string]: string };

@Component({
    selector: 'xm-examination-question',
    templateUrl: './examination-question.component.html',
})
export class ExaminationQuestionComponent implements OnInit, AfterViewInit {
    @Input() exam?: Examination;
    @Input() question!: ExaminationQuestion;
    @Input() isPreview = false;
    @Input() isCollaborative = false;

    clozeAnswer: { [key: string]: string } = {};
    expanded = true;
    sq!: Omit<ExaminationQuestion, 'essayAnswer'> & { essayAnswer: EssayAnswer };
    questionTitle!: string;

    constructor(
        private cdr: ChangeDetectorRef,
        private Examination: ExaminationService,
        private Attachment: AttachmentService,
    ) {}

    ngOnInit() {
        this.sq = this.question as Omit<ExaminationQuestion, 'essayAnswer'> & { essayAnswer: EssayAnswer }; // FIXME
        this.sq.expanded = true;
        if (this.sq.question.type === 'ClozeTestQuestion' && this.sq.clozeTestAnswer?.answer) {
            const { answer } = this.sq.clozeTestAnswer;
            this.clozeAnswer = JSON.parse(answer);
        }
    }

    ngAfterViewInit() {
        this.cdr.detectChanges();
    }

    answered = (answer: ClozeTestAnswer) => {
        const { id, value } = answer;
        if (this.sq.clozeTestAnswer) {
            this.clozeAnswer = {
                ...this.clozeAnswer,
                [id]: value,
            };
            this.sq.clozeTestAnswer.answer = JSON.stringify(this.clozeAnswer);
        }
    };

    downloadQuestionAttachment = () => {
        if (this.exam) {
            if (this.exam.external) {
                this.Attachment.downloadExternalQuestionAttachment(this.exam, this.sq);
            } else if (this.isCollaborative) {
                this.Attachment.downloadCollaborativeQuestionAttachment(this.exam.id, this.sq);
            } else {
                this.Attachment.downloadQuestionAttachment(this.sq.question);
            }
            console.error('Cannot retrieve attachment without exam.');
        }
    };

    isAnswered = () => this.Examination.isAnswered(this.sq);
}
