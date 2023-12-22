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
import { NgIf, UpperCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import type { Exam, ExamParticipation, ExamSectionQuestion } from '../../../exam/exam.model';
import type { ExaminationQuestion } from '../../../examination/examination.model';
import { AttachmentService } from '../../../shared/attachment/attachment.service';
import { MathJaxDirective } from '../../../shared/math/math-jax.directive';
import { FixedPrecisionValidatorDirective } from '../../../shared/validation/fixed-precision.directive';
import type { ReviewQuestion } from '../../review.model';
import { AssessmentService } from '../assessment.service';

@Component({
    selector: 'xm-r-essay-question',
    templateUrl: './essay-question.component.html',
    standalone: true,
    imports: [
        MathJaxDirective,
        NgIf,
        NgbCollapse,
        FormsModule,
        FixedPrecisionValidatorDirective,
        UpperCasePipe,
        TranslateModule,
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

    constructor(
        private route: ActivatedRoute,
        private translate: TranslateService,
        private toast: ToastrService,
        private Assessment: AssessmentService,
        private CommonExam: CommonExamService,
        private Attachment: AttachmentService,
    ) {}

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
            return this.Assessment.saveCollaborativeEssayScore$(
                this.sectionQuestion as ExaminationQuestion,
                this.id,
                this.ref,
                this.participation._rev as string,
            ).subscribe((resp) => {
                this.toast.info(this.translate.instant('i18n_graded'));
                this.scored.emit(resp.rev);
            });
        } else {
            return this.Assessment.saveEssayScore$(this.sectionQuestion as ExaminationQuestion).subscribe(() => {
                this.toast.info(this.translate.instant('i18n_graded')), this.scored.emit();
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
