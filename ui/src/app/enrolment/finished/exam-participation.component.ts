// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, OnDestroy, signal } from '@angular/core';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type { CollaborativeParticipation, ParticipationLike, ReviewedExam } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { Exam } from 'src/app/exam/exam.model';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';
import { ExamFeedbackComponent } from './exam-feedback.component';

type Scores = {
    maxScore: number;
    totalScore: number;
    approvedAnswerCount: number;
    rejectedAnswerCount: number;
    hasApprovedRejectedAnswers: boolean;
};
@Component({
    selector: 'xm-exam-participation',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './exam-participation.component.html',
    imports: [
        NgClass,
        CourseCodeComponent,
        TeacherListComponent,
        NgbCollapse,
        ExamFeedbackComponent,
        DatePipe,
        TranslateModule,
        ApplyDstPipe,
    ],
    styleUrl: './exam-participations.component.scss',
})
export class ExamParticipationComponent implements OnDestroy {
    participation = input.required<ParticipationLike>();
    collaborative = input(false);

    reviewedExam = signal<ReviewedExam | undefined>(undefined);
    scores = signal<Scores | undefined>(undefined);
    showEvaluation = signal(false);
    gradeDisplayName = signal('');
    private ngUnsubscribe = new Subject<void>();

    private translate = inject(TranslateService);
    private Exam = inject(CommonExamService);
    private Enrolment = inject(EnrolmentService);

    constructor() {
        // React to participation changes and initialize review
        effect(() => {
            const participation = this.participation();
            const state = participation.exam.state;
            if (
                state === 'GRADED_LOGGED' ||
                state === 'REJECTED' ||
                state === 'ARCHIVED' ||
                (state === 'GRADED' && participation.exam.autoEvaluationNotified)
            ) {
                if (this.collaborative()) {
                    // No need to load anything, because we have already everything.
                    this.prepareReview(participation.exam as ReviewedExam);
                    return;
                }
                this.loadReview(participation.exam as Exam);
            }
        });

        // React to language changes
        this.translate.onLangChange.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
            const participation = this.participation();
            if (participation.exam.grade) {
                this.gradeDisplayName.set(this.Exam.getExamGradeDisplayName(participation.exam.grade.name));
            }
        });
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    setCommentRead(exam: Exam | ReviewedExam) {
        if (
            this.collaborative() &&
            this.participation().exam.examFeedback &&
            !this.participation().exam.examFeedback.feedbackStatus
        ) {
            const participation = this.participation() as CollaborativeParticipation;
            this.Enrolment.setCommentRead$(participation.examId, participation._id, participation._rev)
                .pipe(takeUntil(this.ngUnsubscribe))
                .subscribe(() => {
                    if (this.participation().exam.examFeedback) {
                        this.participation().exam.examFeedback.feedbackStatus = true;
                    }
                });
        } else if (exam.examFeedback) {
            this.Enrolment.setCommentRead(exam);
        }
    }

    toggleEvaluation() {
        this.showEvaluation.update((v) => !v);
        const reviewedExam = this.reviewedExam();
        if (reviewedExam) {
            this.setCommentRead(reviewedExam);
        }
    }

    private loadReview = (exam: Exam) =>
        this.Enrolment.loadFeedback$(exam.id).pipe(takeUntil(this.ngUnsubscribe)).subscribe(this.prepareReview);

    private prepareReview = (exam: ReviewedExam) => {
        if (exam.gradingType === 'NOT_GRADED') {
            exam.grade = {
                name: 'NOT_GRADED',
                displayName: this.translate.instant('i18n_not_graded'),
            };
        }
        if (exam.gradingType === 'POINT_GRADED') {
            exam.grade = {
                name: 'POINT_GRADED',
                displayName: this.translate.instant('i18n_point_graded'),
            };
        }
        if (exam.languageInspection) {
            exam.grade!.displayName = this.translate.instant(
                exam.languageInspection.approved ? 'i18n_approved' : 'i18n_rejected',
            );
            exam.contentGrade = this.Exam.getExamGradeDisplayName(exam.grade!.name);
            exam.gradedTime = exam.languageInspection.finishedAt;
        } else {
            exam.grade!.displayName = this.Exam.getExamGradeDisplayName(exam.grade!.name);
        }
        const credit = this.Exam.getCredit(exam);
        exam.credit = credit;
        if (exam.creditType) {
            exam.creditType.displayName = this.Exam.getExamTypeDisplayName(exam.creditType.type);
        }

        this.reviewedExam.set(exam);
        if (this.collaborative()) {
            // No need to load separate scores.
            this.prepareScores(exam);
            return;
        }
        this.Enrolment.loadScore$(this.participation().exam.id)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(this.prepareScores);
    };

    private prepareScores = (exam: ReviewedExam) => {
        this.scores.set({
            maxScore: exam.maxScore,
            totalScore: exam.totalScore,
            approvedAnswerCount: exam.approvedAnswerCount,
            rejectedAnswerCount: exam.rejectedAnswerCount,
            hasApprovedRejectedAnswers: exam.approvedAnswerCount + exam.rejectedAnswerCount > 0,
        });
    };
}
