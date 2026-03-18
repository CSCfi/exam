// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Exam } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { GradingBaseComponent } from 'src/app/review/assessment/common/grading-base.component';
import type { User } from 'src/app/session/session.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { LanguageService } from 'src/app/shared/language/language.service';
import { MathDirective } from 'src/app/shared/math/math.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { InspectionCommentsComponent } from './inspection-comments.component';
import { MaturityToolbarComponent } from './toolbar.component';

@Component({
    selector: 'xm-r-maturity-grading',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './grading.component.html',
    styleUrls: ['../assessment.shared.scss'],
    imports: [
        ReactiveFormsModule,
        NgbPopover,
        InspectionCommentsComponent,
        MathDirective,
        MaturityToolbarComponent,
        UpperCasePipe,
        TranslateModule,
    ],
})
export class MaturityGradingComponent extends GradingBaseComponent implements OnInit {
    readonly exam = input.required<Exam>();
    readonly user = input.required<User>();
    readonly questionSummary = input<unknown>();
    readonly updated = output<void>();

    private readonly translate = inject(TranslateService);
    private readonly Attachment = inject(AttachmentService);
    private readonly destroyRef = inject(DestroyRef);

    private readonly formDisabled = computed(
        () => this.isReadOnly() || !this.isOwnerOrAdmin() || this.isAwaitingInspection(),
    );

    constructor() {
        const http = inject(HttpClient);
        const toast = inject(ToastrService);
        const Assessment = inject(AssessmentService);
        const Exam = inject(ExamService);
        const CommonExam = inject(CommonExamService);
        const Language = inject(LanguageService);

        super(http, toast, Assessment, Exam, CommonExam, Language);

        toObservable(this.formDisabled)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((disabled) => {
                if (disabled) {
                    this.gradingForm.disable({ emitEvent: false });
                } else {
                    this.gradingForm.enable({ emitEvent: false });
                }
            });

        this.gradingForm.controls.customCredit.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((value) => {
                if (value !== null) {
                    this.getExam().customCredit = value;
                }
            });

        this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.initCreditTypes();
            this.grades.update((gs) =>
                gs.map((g) => ({ ...g, name: this.CommonExam.getExamGradeDisplayName(g.type) })),
            );
        });
    }

    ngOnInit() {
        this.initGrades(true);
        this.initCreditTypes();
        this.initLanguages();
        this.gradingForm.controls.customCredit.setValue(this.exam().customCredit ?? null, { emitEvent: false });
    }

    getExam = () => this.exam();

    isUnderLanguageInspection = () =>
        this.user().isLanguageInspector && this.exam().languageInspection && !this.exam().languageInspection.finishedAt;
    hasGoneThroughLanguageInspection = () =>
        this.exam().languageInspection && this.exam().languageInspection.finishedAt;
    isAwaitingInspection = () => this.exam().languageInspection && !this.exam().languageInspection.finishedAt;
    canFinalizeInspection = () => this.exam().languageInspection?.statement.comment;
    isReadOnly = () => this.Assessment.isReadOnly(this.exam());
    isOwnerOrAdmin = () => this.Exam.isOwnerOrAdmin(this.exam());
    downloadFeedbackAttachment = () => this.Attachment.downloadFeedbackAttachment(this.exam());
    downloadStatementAttachment = () => this.Attachment.downloadStatementAttachment(this.exam());
    getExamMaxPossibleScore = () => this.Exam.getMaxScore(this.exam());
    inspectionDone = () => this.updated.emit();
    isGraded = () => this.Assessment.isGraded(this.exam());
    isMaturityRejection = () =>
        this.exam().executionType.type === 'MATURITY' &&
        !this.exam().subjectToLanguageInspection &&
        this.exam().grade !== undefined &&
        this.exam().grade?.marksRejection;

    onCommentAdded = (comment: { comment: string; creator: User; created: Date }) => {
        // Update exam object to keep it in sync
        const exam = this.exam();
        if (!exam.inspectionComments) {
            exam.inspectionComments = [];
        }
        exam.inspectionComments.unshift(comment);
    };

    onAdditionalInfoInput = (event: Event) => {
        this.getExam().additionalInfo = (event.target as HTMLTextAreaElement).value;
    };

    onAssessmentInfoInput = (event: Event) => {
        this.getExam().assessmentInfo = (event.target as HTMLTextAreaElement).value;
    };

    saveAssessmentInfo = () => this.Assessment.saveAssessmentInfo$(this.exam()).subscribe();
}
