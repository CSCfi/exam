// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { LowerCasePipe, NgClass } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    NgbNav,
    NgbNavContent,
    NgbNavItem,
    NgbNavItemRole,
    NgbNavLink,
    NgbNavOutlet,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Observable, catchError, forkJoin, of, tap } from 'rxjs';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { QuestionFlowComponent } from 'src/app/review/questions/flow/question-flow.component';
import { QuestionReviewService } from 'src/app/review/questions/question-review.service';
import type { QuestionReview, ReviewQuestion } from 'src/app/review/review.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { HistoryBackComponent } from 'src/app/shared/history/history-back.component';
import { MathJaxDirective } from 'src/app/shared/math/math-jax.directive';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';
import { EssayAnswerListComponent } from './essay-answers.component';

@Component({
    selector: 'xm-question-assessment',
    templateUrl: './question-assessment.component.html',
    styleUrls: ['./question-assessment.component.scss'],
    standalone: true,
    imports: [
        HistoryBackComponent,
        NgClass,
        MathJaxDirective,
        NgbNav,
        NgbNavItem,
        NgbNavItemRole,
        NgbNavLink,
        NgbNavContent,
        EssayAnswerListComponent,
        NgbNavOutlet,
        QuestionFlowComponent,
        LowerCasePipe,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class QuestionAssessmentComponent implements OnInit {
    user: User;
    examId = 0;
    reviews: QuestionReview[] = [];
    selectedReview!: QuestionReview & { expanded: boolean };
    assessedAnswers: ReviewQuestion[] = [];
    unassessedAnswers: ReviewQuestion[] = [];
    lockedAnswers: ReviewQuestion[] = [];
    allAnswersExpanded = true;

    constructor(
        private route: ActivatedRoute,
        private translate: TranslateService,
        private toast: ToastrService,
        private QuestionReview: QuestionReviewService,
        private Assessment: AssessmentService,
        private Session: SessionService,
        private Attachment: AttachmentService,
    ) {
        this.user = this.Session.getUser();
    }

    ngOnInit() {
        this.examId = this.route.snapshot.params.id;
        const ids = this.route.snapshot.queryParamMap.getAll('q');
        this.QuestionReview.getReviews$(this.examId, ids).subscribe({
            next: (reviews) => {
                reviews.forEach((r, i) => (r.selected = i === 0)); // select the first in the list
                this.reviews = reviews;
                if (this.reviews.length > 0) {
                    this.setSelectedReview(this.reviews[0]);
                }
            },
            error: (err) => this.toast.error(err),
        });
    }

    getAssessedAnswerCount = (includeLocked: boolean) => {
        if (includeLocked) {
            return this.assessedAnswers.length + this.lockedAnswers.length;
        }
        return this.assessedAnswers.length;
    };

    getUnassessedAnswerCount = () => this.unassessedAnswers.length;

    getLockedAnswerCount = () => this.lockedAnswers.length;

    questionSelected = (index: number) => this.setSelectedReview(this.reviews[index]);

    isFinalized = (review: QuestionReview) => this.QuestionReview.isFinalized(review);

    saveAssessments = (answers: ReviewQuestion[]) =>
        forkJoin(answers.map(this.saveEvaluation$)).subscribe(() => (this.reviews = [...this.reviews]));

    downloadQuestionAttachment = () => this.Attachment.downloadQuestionAttachment(this.selectedReview.question);

    toggleAllAnswers = () => {
        const allAnswers = [...this.assessedAnswers, ...this.unassessedAnswers, ...this.lockedAnswers];
        this.allAnswersExpanded = !this.allAnswersExpanded;
        allAnswers.forEach((answer) => {
            answer.expanded = this.allAnswersExpanded;
        });
    };

    setSelectedReview = (review: QuestionReview) => {
        this.selectedReview = { ...review, expanded: true };
        this.assessedAnswers = this.selectedReview.answers.filter(
            (a) => a.essayAnswer && isNumber(a.essayAnswer.evaluatedScore) && !this.isLocked(a),
        );
        this.unassessedAnswers = this.selectedReview.answers.filter(
            (a) => !a.essayAnswer || (!isNumber(a.essayAnswer.evaluatedScore) && !this.isLocked(a)),
        );
        this.lockedAnswers = this.selectedReview.answers.filter(this.isLocked);
    };

    private saveEvaluation$ = (answer: ReviewQuestion): Observable<void> => {
        // TODO: this looks shady with rollback and all, whatabout smth like
        // const tempAnswer: ReviewQuestion = {...answer, essayAnswer: {... answer.essayAnswer, evaluatedScore: answer.essayAnswer.temporaryScore}};
        answer.essayAnswer.evaluatedScore = answer.essayAnswer.temporaryScore;
        return this.Assessment.saveEssayScore$(answer).pipe(
            tap(() => {
                this.toast.info(this.translate.instant('i18n_graded'));
                if (this.assessedAnswers.indexOf(answer) === -1) {
                    this.unassessedAnswers.splice(this.unassessedAnswers.indexOf(answer), 1);
                    this.assessedAnswers.push(answer);

                    // Make sure that this.reviews gets also updated
                    const currentQuestionId = this.selectedReview.question.id;
                    const currentReviewIndex = this.reviews.findIndex((r) => r.question.id === currentQuestionId);

                    if (this.reviews[currentReviewIndex]) {
                        const currentAnswerIndex = this.reviews[currentReviewIndex].answers.findIndex(
                            (a) => a.id === answer.id,
                        );
                        if (this.reviews[currentReviewIndex].answers[currentAnswerIndex]) {
                            this.reviews[currentReviewIndex].answers[currentAnswerIndex] = { ...answer };
                        }
                    }
                }
            }),
            catchError((err) => {
                // Roll back
                answer.essayAnswer.evaluatedScore = answer.essayAnswer.temporaryScore;
                this.toast.error(err);
                return of();
            }),
        );
    };

    private isLocked = (answer: ReviewQuestion) => {
        const states = ['REVIEW', 'REVIEW_STARTED'];
        const exam = answer.examSection.exam;
        const isInspector = exam.examInspections.some((ei) => ei.user.id === this.user.id);
        if (!isInspector) {
            states.push('GRADED');
        }
        return states.indexOf(exam.state) === -1;
    };
}
