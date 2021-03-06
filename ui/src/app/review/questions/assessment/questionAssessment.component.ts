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
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import * as _ from 'lodash';
import { forkJoin } from 'rxjs';
import * as toast from 'toastr';

import { SessionService } from '../../../session/session.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { AssessmentService } from '../../assessment/assessment.service';
import { QuestionReviewService } from '../questionReview.service';

import type { User } from '../../../session/session.service';
import type { QuestionReview, ReviewQuestion } from '../../review.model';
@Component({
    selector: 'question-assessment',
    templateUrl: './questionAssessment.component.html',
})
export class QuestionAssessmentComponent {
    user: User;
    examId: number;
    ids: number[];
    reviews: QuestionReview[] = [];
    selectedReview: QuestionReview & { expanded: boolean };
    assessedAnswers: ReviewQuestion[] = [];
    unassessedAnswers: ReviewQuestion[] = [];
    lockedAnswers: ReviewQuestion[] = [];

    constructor(
        private state: StateService,
        private $translate: TranslateService,
        private QuestionReview: QuestionReviewService,
        private Assessment: AssessmentService,
        private Session: SessionService,
        private Attachment: AttachmentService,
    ) {}

    ngOnInit() {
        this.user = this.Session.getUser();
        this.examId = this.state.params.id;
        const ids = this.state.params.q || [];
        this.QuestionReview.getReviews$(this.examId, ids).subscribe(
            (reviews) => {
                reviews.forEach((r, i) => (r.selected = i === 0)); // select the first in the list
                this.reviews = reviews;
                if (this.reviews.length > 0) {
                    this.setSelectedReview(this.reviews[0]);
                }
            },
            (err) => toast.error(err),
        );
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

    private saveEvaluation = (answer: ReviewQuestion) => {
        return new Promise<void>((resolve) => {
            answer.essayAnswer.evaluatedScore = answer.essayAnswer.temporaryScore;
            this.Assessment.saveEssayScore$(answer).subscribe(() => {
                toast.info(this.$translate.instant('sitnet_graded'));
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
                            this.reviews[currentReviewIndex].answers[currentAnswerIndex] = _.cloneDeep(answer);
                        }
                    }
                }
                resolve();
            }),
                (err: string) => {
                    // Roll back
                    answer.essayAnswer.evaluatedScore = answer.essayAnswer.temporaryScore;
                    toast.error(err);
                    resolve();
                };
        });
    };

    saveAssessments = (answers: ReviewQuestion[]) =>
        forkJoin(answers.map(this.saveEvaluation)).subscribe(() => (this.reviews = _.cloneDeep(this.reviews)));

    downloadQuestionAttachment = () => this.Attachment.downloadQuestionAttachment(this.selectedReview.question);

    setSelectedReview = (review: QuestionReview) => {
        this.selectedReview = { ...review, expanded: true };
        this.assessedAnswers = this.selectedReview.answers.filter(
            (a) => a.essayAnswer && _.isNumber(a.essayAnswer.evaluatedScore) && !this.isLocked(a),
        );
        this.unassessedAnswers = this.selectedReview.answers.filter(
            (a) => !a.essayAnswer || (!_.isNumber(a.essayAnswer.evaluatedScore) && !this.isLocked(a)),
        );
        this.lockedAnswers = this.selectedReview.answers.filter(this.isLocked);
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
