// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { ExamSectionQuestion } from 'src/app/question/question.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { MathDirective } from 'src/app/shared/math/math.directive';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';
import { FixedPrecisionValidatorDirective } from 'src/app/shared/validation/fixed-precision.directive';

@Component({
    selector: 'xm-r-cloze-test',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './cloze-test.component.html',
    imports: [MathDirective, ReactiveFormsModule, FixedPrecisionValidatorDirective, UpperCasePipe, TranslateModule],
    styleUrls: ['../assessment.shared.scss'],
})
export class ClozeTestComponent {
    readonly participation = input.required<ExamParticipation>();
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
    private readonly Attachment = inject(AttachmentService);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;

        effect(() => {
            if (this.isScorable()) {
                this.scoreControl.enable({ emitEvent: false });
            } else {
                this.scoreControl.disable({ emitEvent: false });
            }
        });

        effect(() => {
            this.scoreControl.setValue(this.sectionQuestion().forcedScore ?? null, { emitEvent: false });
        });

        this.scoreControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
            if (this.scoreControl.valid) {
                this.sectionQuestion().forcedScore = value;
            }
        });
    }

    hasForcedScore = () => isNumber(this.sectionQuestion().forcedScore);

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

    displayAchievedScore = () => {
        const sq = this.sectionQuestion();
        const max = sq.maxScore;
        const score = sq.clozeTestAnswer?.score;
        if (score) {
            const value = (score.correctAnswers * max) / (score.correctAnswers + score.incorrectAnswers);
            return Number.isInteger(value) ? value : value.toFixed(2);
        }
        return 0;
    };

    insertForcedScore = () => {
        const sq = this.sectionQuestion();
        const participationValue = this.participation();
        if (this.collaborative()) {
            this.Assessment.saveCollaborativeForcedScore$(
                sq,
                this.id,
                this.ref,
                participationValue._rev as string,
            ).subscribe((resp) => {
                this.toast.info(this.translate.instant('i18n_graded'));
                this.scored.emit(resp.rev);
            });
        } else {
            this.Assessment.saveForcedScore(sq).subscribe(() => this.toast.info(this.translate.instant('i18n_graded')));
        }
    };
}
