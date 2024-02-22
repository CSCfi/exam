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
import { forkJoin } from 'rxjs';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { isNumber } from 'src/app/shared/miscellaneous/helpers';
import type { User } from '../../../session/session.service';
import { SessionService } from '../../../session/session.service';
import { AttachmentService } from '../../../shared/attachment/attachment.service';
import { HistoryBackComponent } from '../../../shared/history/history-back.component';
import { MathJaxDirective } from '../../../shared/math/math-jax.directive';
import { AssessmentService } from '../../assessment/assessment.service';
import type { QuestionReview, ReviewQuestion } from '../../review.model';
import { QuestionFlowComponent } from '../flow/question-flow.component';
import { QuestionReviewService } from '../question-review.service';
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
        forkJoin(answers.map(this.saveEvaluation)).subscribe(() => (this.reviews = [...this.reviews]));

    downloadQuestionAttachment = () => this.Attachment.downloadQuestionAttachment(this.selectedReview.question);

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

    private saveEvaluation = (answer: ReviewQuestion) => {
        return new Promise<void>((resolve) => {
            answer.essayAnswer.evaluatedScore = answer.essayAnswer.temporaryScore;
            this.Assessment.saveEssayScore$(answer).subscribe(() => {
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
                resolve();
            }),
                (err: string) => {
                    // Roll back
                    answer.essayAnswer.evaluatedScore = answer.essayAnswer.temporaryScore;
                    this.toast.error(err);
                    resolve();
                };
        });
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
