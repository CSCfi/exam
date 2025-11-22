// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal, ViewChild } from '@angular/core';
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
import { MathUnifiedDirective } from 'src/app/shared/math/math.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';

@Component({
    selector: 'xm-r-essay-question',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './essay-question.component.html',
    styleUrls: ['../assessment.shared.scss', './essay-question.component.scss'],
    imports: [
        MathUnifiedDirective,
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
    @ViewChild('essayPoints', { static: false }) form?: NgForm;

    participation = input.required<ExamParticipation>();
    exam = input.required<Exam>();
    sectionQuestion = input.required<ExamSectionQuestion>();
    isScorable = input(false);
    collaborative = input(false);
    scored = output<string>();

    id = 0;
    ref = '';
    reviewExpanded = signal(true);
    _score = signal<number | undefined>(undefined);

    private route = inject(ActivatedRoute);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Assessment = inject(AssessmentService);
    private CommonExam = inject(CommonExamService);
    private Attachment = inject(AttachmentService);

    get scoreValue(): number | undefined {
        return this._score();
    }

    set scoreValue(value: number | undefined) {
        this._score.set(value);
        const sq = this.sectionQuestion();
        const answer = sq.essayAnswer!.answer;
        if (!this.form || this.form.valid) {
            sq.essayAnswer = {
                ...sq.essayAnswer,
                evaluatedScore: value,
                answer: answer,
            };
        } else {
            sq.essayAnswer = {
                ...sq.essayAnswer,
                evaluatedScore: undefined,
                answer: answer,
            };
        }
    }

    ngOnInit() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;
        const sq = this.sectionQuestion();
        if (!sq.essayAnswer) {
            sq.essayAnswer = { answer: '' };
        }
        this.scoreValue = sq.essayAnswer.evaluatedScore;
    }

    toggleReviewExpanded = () => this.reviewExpanded.update((v) => !v);

    downloadQuestionAttachment = () => {
        const sq = this.sectionQuestion();
        if (this.collaborative() && sq.question.attachment?.externalId) {
            return this.Attachment.downloadCollaborativeAttachment(
                sq.question.attachment.externalId,
                sq.question.attachment.fileName,
            );
        }
        return this.Attachment.downloadQuestionAttachment(sq.question);
    };

    downloadQuestionAnswerAttachment = () => {
        const sq = this.sectionQuestion();
        if (this.collaborative() && sq?.essayAnswer?.attachment?.externalId) {
            return this.Attachment.downloadCollaborativeAttachment(
                sq.essayAnswer.attachment.externalId,
                sq.essayAnswer.attachment.fileName,
            );
        }
        return this.Attachment.downloadQuestionAnswerAttachment(sq as ReviewQuestion);
    };

    insertEssayScore = () => {
        const sq = this.sectionQuestion();
        const participationValue = this.participation();
        if (this.collaborative()) {
            this.Assessment.saveCollaborativeEssayScore$(
                sq,
                this.id,
                this.ref,
                participationValue._rev as string,
            ).subscribe((resp) => {
                this.toast.info(this.translate.instant('i18n_graded'));
                this.scored.emit(resp.rev);
            });
        } else {
            this.Assessment.saveEssayScore$(sq).subscribe(() => {
                this.toast.info(this.translate.instant('i18n_graded'));
                this.scored.emit('');
            });
        }
    };

    getWordCount = () => {
        const sq = this.sectionQuestion();
        if (!sq.essayAnswer?.answer) {
            return 0;
        }
        return this.CommonExam.countWords(sq.essayAnswer.answer);
    };

    getCharacterCount = () => {
        const sq = this.sectionQuestion();
        if (!sq.essayAnswer?.answer) {
            return 0;
        }
        return this.CommonExam.countCharacters(sq.essayAnswer.answer);
    };

    displayMaxScore = () => {
        const sq = this.sectionQuestion();
        return !sq.maxScore || Number.isInteger(sq.maxScore) ? sq.maxScore : sq.maxScore.toFixed(2);
    };
}
