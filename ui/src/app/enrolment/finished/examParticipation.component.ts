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
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { noop, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ExamService } from '../../exam/exam.service';
import { AssessmentService } from '../../review/assessment/assessment.service';
import { CollaborativeAssesmentService } from '../../review/assessment/collaborativeAssessment.service';

import type { CollaborativeParticipation } from '../../exam/collaborative/collaborativeExam.service';
import type { ExamParticipation } from '../../exam/exam.model';
import type { OnInit } from '@angular/core';
import type { Exam } from '../../exam/exam.model';
import type { ReviewedExam } from '../enrolment.model';

type Scores = {
    maxScore: number;
    totalScore: number;
    approvedAnswerCount: number;
    rejectedAnswerCount: number;
    hasApprovedRejectedAnswers: boolean;
};
@Component({
    selector: 'exam-participation',
    templateUrl: './examParticipation.component.html',
})
export class ExamParticipationComponent implements OnInit {
    @Input() participation: ExamParticipation | CollaborativeParticipation;
    @Input() collaborative: boolean;

    reviewedExam: ReviewedExam;
    scores: Scores;
    showEvaluation = false;
    gradeDisplayName = '';
    private ngUnsubscribe = new Subject();

    constructor(
        private translate: TranslateService,
        private http: HttpClient,
        private Exam: ExamService,
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

    ngOnDestroy = () => {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    };

    setCommentRead = (exam: Exam | ReviewedExam) => {
        if (
            this.collaborative &&
            this.participation.exam.examFeedback &&
            !this.participation.exam.examFeedback.feedbackStatus
        ) {
            const participation = this.participation as CollaborativeParticipation;
            this.CollaborativeAssessment.setCommentRead$(
                participation.examId,
                participation._id,
                participation._rev,
            ).subscribe(() => {
                if (this.participation.exam.examFeedback) {
                    this.participation.exam.examFeedback.feedbackStatus = true;
                }
            });
        } else {
            this.Assessment.setCommentRead(exam);
        }
    };

    private loadReview = (exam: Exam) =>
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

        this.reviewedExam = exam;
        if (this.collaborative) {
            // No need to load separate scores.
            this.prepareScores(exam);
            return;
        }
        this.http
            .get<ReviewedExam>(`/app/feedback/exams/${this.participation.exam.id}/score`)
            .subscribe(this.prepareScores, () => noop);
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
