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
import { StateParams } from '@uirouter/core';
import * as angular from 'angular';
import * as _ from 'lodash';
import * as toast from 'toastr';

import { SessionService, User } from '../../../session/session.service';
import { AttachmentService } from '../../../utility/attachment/attachment.service';
import { QuestionReview, ReviewQuestion } from '../../review.model';
import { QuestionReviewService } from '../questionReview.service';

export const QuestionAssessmentComponent: angular.IComponentOptions = {
    template: require('./questionAssessment.template.html'),
    controller: class QuestionAssessmentComponentController implements angular.IComponentController {
        user: User;
        examId: number;
        ids: number[];
        reviews: QuestionReview[];
        selectedReview: QuestionReview;
        assessedAnswers: ReviewQuestion[] = [];
        unassessedAnswers: ReviewQuestion[] = [];
        lockedAnswers: ReviewQuestion[] = [];

        constructor(
            private $stateParams: StateParams,
            private $sce: angular.ISCEService,
            private $q: angular.IQService,
            private $translate: angular.translate.ITranslateService,
            private QuestionReview: QuestionReviewService,
            private Assessment: any, // TODO
            private Session: SessionService,
            private Attachment: AttachmentService,
        ) {
            'ngInject';
        }

        $onInit() {
            this.user = this.Session.getUser();
            this.examId = this.$stateParams.id;
            const ids = this.$stateParams.q || [];
            this.QuestionReview.getReviews(this.examId, ids).then(reviews => {
                reviews.forEach((r, i) => (r.selected = i === 0)); // select the first in the list
                this.reviews = reviews;
                if (this.reviews.length > 0) {
                    this.setSelectedReview(this.reviews[0]);
                }
            });
        }

        sanitizeQuestion = () => {
            if (!this.selectedReview) {
                return;
            }
            return this.$sce.trustAsHtml(this.selectedReview.question.question);
        };

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
            return new Promise<void>(resolve => {
                answer.essayAnswer.evaluatedScore = answer.essayAnswer.temporaryScore;
                this.Assessment.saveEssayScore(answer)
                    .then(() => {
                        toast.info(this.$translate.instant('sitnet_graded'));
                        if (this.assessedAnswers.indexOf(answer) === -1) {
                            this.unassessedAnswers.splice(this.unassessedAnswers.indexOf(answer), 1);
                            this.assessedAnswers.push(answer);
                        }
                        resolve();
                    })
                    .catch(err => {
                        // Roll back
                        answer.essayAnswer.evaluatedScore = answer.essayAnswer.temporaryScore;
                        toast.error(err.data);
                        resolve();
                    });
            });
        };

        saveAssessments = (answers: ReviewQuestion[]) => {
            const promises: Promise<void>[] = answers.map(this.saveEvaluation);
            this.$q.when(Promise.all(promises)).then(() => (this.reviews = angular.copy(this.reviews)));
        };

        downloadQuestionAttachment = () => this.Attachment.downloadQuestionAttachment(this.selectedReview.question);

        setSelectedReview = (review: QuestionReview) => {
            this.selectedReview = review;
            this.assessedAnswers = this.selectedReview.answers.filter(
                a => a.essayAnswer && _.isNumber(a.essayAnswer.evaluatedScore) && !this.isLocked(a),
            );
            this.unassessedAnswers = this.selectedReview.answers.filter(
                a => !a.essayAnswer || (!_.isNumber(a.essayAnswer.evaluatedScore) && !this.isLocked(a)),
            );
            this.lockedAnswers = this.selectedReview.answers.filter(this.isLocked);
        };

        private isLocked = (answer: ReviewQuestion) => {
            const states = ['REVIEW', 'REVIEW_STARTED'];
            const exam = answer.examSection.exam;
            const isInspector = exam.examInspections.some(ei => ei.user.id === this.user.id);
            if (!isInspector) {
                states.push('GRADED');
            }
            return states.indexOf(exam.state) === -1;
        };
    },
};

angular.module('app.review').component('questionAssessment', QuestionAssessmentComponent);
