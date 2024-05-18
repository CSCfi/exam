// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, Input, OnDestroy } from '@angular/core';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type { ReviewedExam } from 'src/app/enrolment/enrolment.model';
import type { ParticipationLike } from 'src/app/enrolment/enrolment.service';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { CollaborativeParticipation } from 'src/app/exam/collaborative/collaborative-exam.service';
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
    templateUrl: './exam-participation.component.html',
    standalone: true,
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
export class ExamParticipationComponent implements OnInit, OnDestroy {
    @Input() participation!: ParticipationLike;
    @Input() collaborative = false;

    reviewedExam!: ReviewedExam;
    scores!: Scores;
    showEvaluation = false;
    gradeDisplayName = '';
    private ngUnsubscribe = new Subject();

    constructor(
        private translate: TranslateService,
        private Exam: CommonExamService,
        private Enrolment: EnrolmentService,
    ) {}

    ngOnInit() {
        const state = this.participation.exam.state;
        if (
            state === 'GRADED_LOGGED' ||
            state === 'REJECTED' ||
            state === 'ARCHIVED' ||
            (state === 'GRADED' && this.participation.exam.autoEvaluationNotified)
        ) {
            if (this.collaborative) {
                // No need to load anything, because we have already everything.
                this.prepareReview(this.participation.exam as ReviewedExam);
                return;
            }
            this.loadReview(this.participation.exam as Exam);
        }
        this.translate.onLangChange.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
            if (this.participation.exam.grade) {
                this.gradeDisplayName = this.Exam.getExamGradeDisplayName(this.participation.exam.grade.name);
            }
        });
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    setCommentRead = (exam: Exam | ReviewedExam) => {
        if (
            this.collaborative &&
            this.participation.exam.examFeedback &&
            !this.participation.exam.examFeedback.feedbackStatus
        ) {
            const participation = this.participation as CollaborativeParticipation;
            this.Enrolment.setCommentRead$(participation.examId, participation._id, participation._rev).subscribe(
                () => {
                    if (this.participation.exam.examFeedback) {
                        this.participation.exam.examFeedback.feedbackStatus = true;
                    }
                },
            );
        } else if (exam.examFeedback) {
            this.Enrolment.setCommentRead(exam);
        }
    };

    private loadReview = (exam: Exam) => this.Enrolment.loadFeedback$(exam.id).subscribe(this.prepareReview);

    private prepareReview = (exam: ReviewedExam) => {
        if (!exam.grade) {
            exam.grade = {
                name: 'NONE',
                displayName: '',
            };
        }
        if (exam.languageInspection) {
            exam.grade.displayName = this.translate.instant(
                exam.languageInspection.approved ? 'i18n_approved' : 'i18n_rejected',
            );
            exam.contentGrade = this.Exam.getExamGradeDisplayName(exam.grade.name);
            exam.gradedTime = exam.languageInspection.finishedAt;
        } else {
            exam.grade.displayName = this.Exam.getExamGradeDisplayName(exam.grade.name);
        }
        const credit = this.Exam.getCredit(exam);
        exam.credit = credit;
        if (exam.creditType) {
            exam.creditType.displayName = this.Exam.getExamTypeDisplayName(exam.creditType.type);
        }

        this.reviewedExam = exam;
        if (this.collaborative) {
            // No need to load separate scores.
            this.prepareScores(exam);
            return;
        }
        this.Enrolment.loadScore$(this.participation.exam.id).subscribe(this.prepareScores);
    };

    private prepareScores = (exam: ReviewedExam) => {
        this.scores = {
            maxScore: exam.maxScore,
            totalScore: exam.totalScore,
            approvedAnswerCount: exam.approvedAnswerCount,
            rejectedAnswerCount: exam.rejectedAnswerCount,
            hasApprovedRejectedAnswers: exam.approvedAnswerCount + exam.rejectedAnswerCount > 0,
        };
    };
}
