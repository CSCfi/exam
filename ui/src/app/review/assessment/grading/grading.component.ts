// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, LowerCasePipe, UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { ExamParticipation } from 'src/app/enrolment/enrolment.model';
import type { Exam } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import type { Examination } from 'src/app/examination/examination.model';
import type { QuestionAmounts } from 'src/app/question/question.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { CollaborativeAssesmentService } from 'src/app/review/assessment/collaborative-assessment.service';
import { GradingBaseComponent } from 'src/app/review/assessment/common/grading-base.component';
import type { User } from 'src/app/session/session.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { LanguageService } from 'src/app/shared/language/language.service';
import { MathDirective } from 'src/app/shared/math/math.directive';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { InspectionComponent } from './inspection.component';
import { ToolbarComponent } from './toolbar.component';

@Component({
    selector: 'xm-r-grading',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './grading.component.html',
    styleUrls: ['../assessment.shared.scss'],
    imports: [
        ReactiveFormsModule,
        NgbPopover,
        InspectionComponent,
        MathDirective,
        ToolbarComponent,
        UpperCasePipe,
        LowerCasePipe,
        DatePipe,
        TranslateModule,
    ],
})
export class GradingComponent extends GradingBaseComponent {
    readonly exam = input.required<Examination>();
    readonly participation = input.required<ExamParticipation>();
    readonly user = input.required<User>();
    readonly questionSummary = input<QuestionAmounts>({ accepted: 0, rejected: 0, hasEssays: false });
    readonly collaborative = input(false);
    readonly updated = output<void>();

    readonly message = signal('');

    private readonly id: number;
    private readonly ref: string;

    private readonly route = inject(ActivatedRoute);
    private readonly translate = inject(TranslateService);
    private readonly CollaborativeAssessment = inject(CollaborativeAssesmentService);
    private readonly Attachment = inject(AttachmentService);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        const http = inject(HttpClient);
        const toast = inject(ToastrService);
        const Assessment = inject(AssessmentService);
        const Exam = inject(ExamService);
        const CommonExam = inject(CommonExamService);
        const Language = inject(LanguageService);

        super(http, toast, Assessment, Exam, CommonExam, Language);

        this.id = this.route.snapshot.params.id;
        this.ref = this.route.snapshot.params.ref;

        effect(() => {
            if (this.isReadOnly() || !this.isOwnerOrAdmin()) {
                this.gradingForm.disable({ emitEvent: false });
            } else {
                this.gradingForm.enable({ emitEvent: false });
            }
        });

        effect(() => {
            const exam = this.exam();
            const collaborative = this.collaborative();
            untracked(() => {
                this.initGrades(false, collaborative);
                this.initCreditTypes();
                this.initLanguages();
                this.gradingForm.controls.customCredit.setValue(exam.customCredit ?? null, { emitEvent: false });
            });
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

    getExam = () => this.exam();

    getExamMaxPossibleScore = () => this.Exam.getMaxScore(this.exam());
    getExamTotalScore = () => this.Exam.getTotalScore(this.exam());
    inspectionDone = () => this.updated.emit();
    isOwnerOrAdmin = () => this.Exam.isOwnerOrAdmin(this.exam(), this.collaborative());
    isReadOnly = () => this.Assessment.isReadOnly(this.exam());
    isGraded = () => this.Assessment.isGraded(this.exam());

    getTeacherCount = () => {
        const examValue = this.exam();
        // Do not add up if user exists in both groups
        const examOwners = this.collaborative() ? examValue.examOwners : (examValue.parent as Exam).examOwners;
        const owners = examOwners.filter(
            (owner) => examValue.examInspections.map((inspection) => inspection.user?.id).indexOf(owner.id) === -1,
        );
        return examValue.examInspections.length + owners.length;
    };

    sendEmailMessage = () => {
        const text = this.message();
        if (!text) {
            this.toast.error(this.translate.instant('i18n_email_empty'));
            return;
        }
        const examValue = this.exam();
        if (this.collaborative()) {
            this.CollaborativeAssessment.sendEmailMessage$(this.id, this.ref, text).subscribe({
                next: () => {
                    this.message.set('');
                    this.toast.info(this.translate.instant('i18n_email_sent'));
                },
                error: (err) => this.toast.error(err),
            });
        } else {
            this.http.post(`/app/email/inspection/${examValue.id}`, { msg: text }).subscribe({
                next: () => {
                    this.toast.info(this.translate.instant('i18n_email_sent'));
                    this.message.set('');
                },
                error: (err) => this.toast.error(err),
            });
        }
    };

    saveAssessmentInfo = () => {
        if (this.collaborative()) {
            this.CollaborativeAssessment.saveAssessmentInfo$(this.id, this.ref, this.participation()).subscribe();
        } else {
            this.Assessment.saveAssessmentInfo$(this.exam()).subscribe();
        }
    };

    downloadFeedbackAttachment = () => {
        const examValue = this.exam();
        const attachment = examValue.examFeedback?.attachment;
        if (this.collaborative() && attachment && attachment.externalId) {
            this.Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName);
        } else {
            this.Attachment.downloadFeedbackAttachment(examValue);
        }
    };

    isCommentRead = () => this.Assessment.isCommentRead(this.exam());

    onAdditionalInfoInput = (event: Event) =>
        (this.getExam().additionalInfo = (event.target as HTMLTextAreaElement).value);

    onAssessmentInfoInput = (event: Event) =>
        (this.getExam().assessmentInfo = (event.target as HTMLTextAreaElement).value);

    onMessageTextInput = (event: Event) => this.message.set((event.target as HTMLTextAreaElement).value);
}
