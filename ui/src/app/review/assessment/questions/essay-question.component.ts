// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import type { ReviewQuestion } from 'src/app/review/review.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';

@Component({
    selector: 'xm-r-essay-question',
    templateUrl: './essay-question.component.html',
    styleUrls: ['../assessment.shared.scss', './essay-question.component.scss'],
    imports: [
        MathJaxDirective,
        NgbCollapse,
        FormsModule,
        FixedPrecisionValidatorDirective,
        UpperCasePipe,
        TranslateModule,
    ],
    styles: [
        `
            .warning-no-hover {
                background-color: white;
                border: #e3162e 1px solid;
                color: #e3162e;
            }
        `,
    ],
})
export class EssayQuestionComponent implements OnInit {
    @Input() participation!: ExamParticipation;
    @Input() exam!: Exam;
    @Input() sectionQuestion!: ExamSectionQuestion;
    @Input() isScorable = false;
    @Input() collaborative = false;
    @Output() scored = new EventEmitter<string>();
    @ViewChild('essayPoints', { static: false }) form?: NgForm;

    id = 0;
    ref = '';
    reviewExpanded = true;
    _score: number | undefined = undefined;

    private route = inject(ActivatedRoute);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Assessment = inject(AssessmentService);
    private CommonExam = inject(CommonExamService);
    private Attachment = inject(AttachmentService);

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

    ngOnInit() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
        if (!this.sectionQuestion.essayAnswer) {
            this.sectionQuestion.essayAnswer = { id: 0 };
        }
        this.scoreValue = this.sectionQuestion.essayAnswer.evaluatedScore;
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
            this.Assessment.saveCollaborativeEssayScore$(
                this.sectionQuestion,
                this.id,
                this.ref,
                this.participation._rev as string,
            ).subscribe((resp) => {
                this.toast.info(this.translate.instant('i18n_graded'));
                this.scored.emit(resp.rev);
            });
        } else {
            this.Assessment.saveEssayScore$(this.sectionQuestion).subscribe(() => {
                this.toast.info(this.translate.instant('i18n_graded'));
                this.scored.emit();
            });
        }
    };

    getWordCount = () => {
        if (!this.sectionQuestion.essayAnswer?.answer) {
            return 0;
        }
        return this.CommonExam.countWords(this.sectionQuestion.essayAnswer.answer);
    };

    getCharacterCount = () => {
        if (!this.sectionQuestion.essayAnswer?.answer) {
            return 0;
        }
        return this.CommonExam.countCharacters(this.sectionQuestion.essayAnswer.answer);
    };
    displayMaxScore = () =>
        !this.sectionQuestion.maxScore || Number.isInteger(this.sectionQuestion.maxScore)
            ? this.sectionQuestion.maxScore
            : this.sectionQuestion.maxScore.toFixed(2);
}
