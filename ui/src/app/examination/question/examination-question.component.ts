// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, SlicePipe, UpperCasePipe } from '@angular/common';
import type { AfterViewInit } from '@angular/core';
import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { Examination, ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';
import { EssayAnswer } from 'src/app/question/question.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { DynamicClozeTestComponent } from './dynamic-cloze-test.component';
import { ExaminationClozeTestComponent } from './examination-cloze-test.component';
import { ExaminationEssayQuestionComponent } from './examination-essay-question.component';
import { ExaminationMultiChoiceComponent } from './examination-multi-choice-question.component';
import { ExaminationWeightedMultiChoiceComponent } from './examination-weighted-multi-choice-question.component';

type ClozeTestAnswer = { [key: string]: string };

@Component({
    selector: 'xm-examination-question',
    templateUrl: './examination-question.component.html',
    standalone: true,
    imports: [
        NgClass,
        MathJaxDirective,
        DynamicClozeTestComponent,
        ExaminationEssayQuestionComponent,
        ExaminationClozeTestComponent,
        ExaminationMultiChoiceComponent,
        ExaminationWeightedMultiChoiceComponent,
        UpperCasePipe,
        SlicePipe,
        TranslateModule,
    ],
    styleUrls: ['../examination.shared.scss', './question.shared.scss', './examination-question.component.scss'],
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
