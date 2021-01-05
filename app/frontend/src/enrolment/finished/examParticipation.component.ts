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
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Exam } from '../../exam/exam.model';
import { ExamService } from '../../exam/exam.service';
import { AssessmentService } from '../../review/assessment/assessment.service';
import { CollaborativeAssesmentService } from '../../review/assessment/collaborativeAssessment.service';
import { SessionService } from '../../session/session.service';
import { AssessedParticipation, ReviewedExam } from '../enrolment.model';

@Component({
    selector: 'exam-participation',
    template: require('./examParticipation.component.html'),
})
export class ExamParticipationComponent implements OnInit {
    @Input() participation: AssessedParticipation;
    @Input() collaborative: boolean;

    private ngUnsubscribe = new Subject();

    constructor(
        private translate: TranslateService,
        private http: HttpClient,
        private Exam: ExamService,
        private Session: SessionService,
        private Assessment: AssessmentService,
        private CollaborativeAssessment: CollaborativeAssesmentService,
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
                this.prepareReview(this.participation.exam);
                return;
            }
            this.loadReview(this.participation.exam);
        }
        this.Session.languageChange$.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
            if (this.participation.exam) {
                this.participation.exam.grade.displayName = this.Exam.getExamGradeDisplayName(
                    this.participation.exam.grade.name,
                );
            }
        });
    }

    setCommentRead = (exam: Exam) => {
        if (
            this.collaborative &&
            this.participation.exam.examFeedback &&
            !this.participation.exam.examFeedback.feedbackStatus
        ) {
            this.CollaborativeAssessment.setCommentRead(
                this.participation.examId,
                this.participation._id,
                this.participation._rev,
            ).subscribe(() => {
                this.participation.exam.examFeedback.feedbackStatus = true;
            });
        } else {
            this.Assessment.setCommentRead(exam);
        }
    };

    private loadReview = (exam: ReviewedExam) =>
        this.http.get<ReviewedExam>(`/app/feedback/exams/${exam.id}`).subscribe(this.prepareReview);

    private prepareReview = (exam: ReviewedExam) => {
        if (!exam.grade) {
            exam.grade = {
                name: 'NONE',
                displayName: '',
            };
        }
        if (exam.languageInspection) {
            exam.grade.displayName = this.translate.instant(
                exam.languageInspection.approved ? 'sitnet_approved' : 'sitnet_rejected',
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

        this.participation.exam = exam;
        if (this.collaborative) {
            // No need to load separate scores.
            this.prepareScores(exam);
            return;
        }
        this.http
            .get<ReviewedExam>(`/app/feedback/exams/${this.participation.exam.id}/score`)
            .subscribe(this.prepareScores, err => toastr.error(err.data));
    };

    private prepareScores = (exam: ReviewedExam) => {
        this.participation.scores = {
            maxScore: exam.maxScore,
            totalScore: exam.totalScore,
            approvedAnswerCount: exam.approvedAnswerCount,
            rejectedAnswerCount: exam.rejectedAnswerCount,
            hasApprovedRejectedAnswers: exam.approvedAnswerCount + exam.rejectedAnswerCount > 0,
        };
    };
}
