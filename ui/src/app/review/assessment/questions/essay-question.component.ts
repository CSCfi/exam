// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
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
import { MathDirective } from 'src/app/shared/math/math.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';

@Component({
    selector: 'xm-r-essay-question',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './essay-question.component.html',
    styleUrls: ['../assessment.shared.scss', './essay-question.component.scss'],
    imports: [
        MathDirective,
        NgbCollapse,
        ReactiveFormsModule,
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
export class EssayQuestionComponent {
    readonly participation = input.required<ExamParticipation>();
    readonly exam = input.required<Exam>();
    readonly sectionQuestion = input.required<ExamSectionQuestion>();
    readonly isScorable = input(false);
    readonly collaborative = input(false);
    readonly scored = output<string>();

    readonly reviewExpanded = signal(true);
    readonly scoreControl = new FormControl<number | null>(null);

    private readonly id: number;
    private readonly ref: string;

    private readonly route = inject(ActivatedRoute);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Assessment = inject(AssessmentService);
    private readonly CommonExam = inject(CommonExamService);
    private readonly Attachment = inject(AttachmentService);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;

        toObservable(this.isScorable)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((scorable) => {
                if (scorable) {
                    this.scoreControl.enable({ emitEvent: false });
                } else {
                    this.scoreControl.disable({ emitEvent: false });
                }
            });

        toObservable(this.sectionQuestion)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((sq) => {
                if (!sq.essayAnswer) {
                    sq.essayAnswer = { answer: '' };
                }
                this.scoreControl.setValue(sq.essayAnswer.evaluatedScore ?? null, { emitEvent: false });
            });

        this.scoreControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
            const currentSq = this.sectionQuestion();
            currentSq.essayAnswer = {
                ...currentSq.essayAnswer,
                evaluatedScore: this.scoreControl.valid ? (value ?? undefined) : undefined,
                answer: currentSq.essayAnswer!.answer,
            };
        });
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
