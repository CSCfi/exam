// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { LowerCasePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { MathJaxDirective } from 'src/app/shared/math/mathjax.directive';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';
import { EssayAnswerListComponent } from './essay-answers.component';

@Component({
    selector: 'xm-question-assessment',
    templateUrl: './question-assessment.component.html',
    styleUrls: ['./question-assessment.component.scss'],
    imports: [
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionAssessmentComponent {
    user: User;
    examId = signal(0);
    reviews = signal<QuestionReview[]>([]);
    selectedReview = signal<(QuestionReview & { expanded: boolean }) | undefined>(undefined);
    assessedAnswers = signal<ReviewQuestion[]>([]);
    unassessedAnswers = signal<ReviewQuestion[]>([]);
    lockedAnswers = signal<ReviewQuestion[]>([]);
    allAnswersExpanded = signal(true);

    private route = inject(ActivatedRoute);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private QuestionReview = inject(QuestionReviewService);
    private Assessment = inject(AssessmentService);
    private Session = inject(SessionService);
    private Attachment = inject(AttachmentService);

    constructor() {
        this.user = this.Session.getUser();
        this.examId.set(Number(this.route.snapshot.params.id));
        const ids = this.route.snapshot.queryParamMap.getAll('q');
        this.QuestionReview.getReviews$(this.examId(), ids).subscribe({
            next: (reviews) => {
                reviews.forEach((r, i) => (r.selected = i === 0)); // select the first in the list
                this.reviews.set(reviews);
                if (this.reviews().length > 0) {
                    this.setSelectedReview(this.reviews()[0]);
                }
            },
            error: (err) => this.toast.error(err),
        });
    }

    getAssessedAnswerCount(includeLocked: boolean) {
        if (includeLocked) {
            return this.assessedAnswers().length + this.lockedAnswers().length;
        }
        return this.assessedAnswers().length;
    }

    getUnassessedAnswerCount() {
        return this.unassessedAnswers().length;
    }

    getLockedAnswerCount() {
        return this.lockedAnswers().length;
    }

    questionSelected(index: number) {
        this.setSelectedReview(this.reviews()[index]);
    }

    isFinalized(review: QuestionReview) {
        return this.QuestionReview.isFinalized(review);
    }

    saveAssessments(answers: ReviewQuestion[]) {
        forkJoin(answers.map(this.saveEvaluation$)).subscribe(() => this.reviews.update((v) => [...v]));
    }

    downloadQuestionAttachment() {
        const currentReview = this.selectedReview();
        if (currentReview) {
            this.Attachment.downloadQuestionAttachment(currentReview.question);
        }
    }

    toggleAllAnswers() {
        const allAnswers = [...this.assessedAnswers(), ...this.unassessedAnswers(), ...this.lockedAnswers()];
        this.allAnswersExpanded.update((v) => !v);
        const newExpandedState = this.allAnswersExpanded();
        allAnswers.forEach((answer) => {
            answer.expanded = newExpandedState;
        });
    }

    toggleSelectedReviewExpanded() {
        const currentReview = this.selectedReview();
        if (currentReview) {
            this.selectedReview.set({ ...currentReview, expanded: !currentReview.expanded });
        }
    }

    setSelectedReview(review: QuestionReview) {
        this.selectedReview.set({ ...review, expanded: true });
        const currentReview = this.selectedReview()!;
        this.assessedAnswers.set(
            currentReview.answers.filter(
                (a) => a.essayAnswer && isNumber(a.essayAnswer.evaluatedScore) && !this.isLocked(a),
            ),
        );
        this.unassessedAnswers.set(
            currentReview.answers.filter(
                (a) => !a.essayAnswer || (!isNumber(a.essayAnswer.evaluatedScore) && !this.isLocked(a)),
            ),
        );
        this.lockedAnswers.set(currentReview.answers.filter(this.isLocked));
    }

    private saveEvaluation$ = (answer: ReviewQuestion): Observable<void> => {
        // TODO: this looks shady with rollback and all, whatabout smth like
        // const tempAnswer: ReviewQuestion = {...answer, essayAnswer: {... answer.essayAnswer, evaluatedScore: answer.essayAnswer.temporaryScore}};
        answer.essayAnswer.evaluatedScore = answer.essayAnswer.temporaryScore;
        return this.Assessment.saveEssayScore$(answer).pipe(
            tap(() => {
                this.toast.info(this.translate.instant('i18n_graded'));
                const currentAssessedAnswers = this.assessedAnswers();
                if (currentAssessedAnswers.indexOf(answer) === -1) {
                    const currentUnassessedAnswers = this.unassessedAnswers();
                    this.unassessedAnswers.set(currentUnassessedAnswers.filter((a) => a !== answer));
                    this.assessedAnswers.set([...currentAssessedAnswers, answer]);

                    // Make sure that this.reviews gets also updated
                    const currentReview = this.selectedReview();
                    if (currentReview) {
                        const currentQuestionId = currentReview.question.id;
                        const currentReviews = this.reviews();
                        const currentReviewIndex = currentReviews.findIndex((r) => r.question.id === currentQuestionId);

                        if (currentReviews[currentReviewIndex]) {
                            const currentAnswerIndex = currentReviews[currentReviewIndex].answers.findIndex(
                                (a) => a.id === answer.id,
                            );
                            if (currentReviews[currentReviewIndex].answers[currentAnswerIndex]) {
                                this.reviews.update((reviews) => {
                                    const updatedReviews = [...reviews];
                                    updatedReviews[currentReviewIndex] = {
                                        ...updatedReviews[currentReviewIndex],
                                        answers: updatedReviews[currentReviewIndex].answers.map((a, i) =>
                                            i === currentAnswerIndex ? { ...answer } : a,
                                        ),
                                    };
                                    return updatedReviews;
                                });
                            }
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

    private isLocked(answer: ReviewQuestion) {
        const states = ['REVIEW', 'REVIEW_STARTED'];
        const exam = answer.examSection.exam;
        const isInspector = exam.examInspections.some((ei) => ei.user.id === this.user.id);
        if (!isInspector) {
            states.push('GRADED');
        }
        return states.indexOf(exam.state) === -1;
    }
}
