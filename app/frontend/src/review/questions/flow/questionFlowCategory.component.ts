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

import * as angular from 'angular';
import { QuestionReview } from '../../review.model';
import { QuestionReviewService } from '../questionReview.service';
import { SessionService } from '../../../session/session.service';

const truncate = require('truncate-html').default;

export const QuestionFlowCategoryComponent: angular.IComponentOptions = {
    template: require('./questionFlowCategory.template.html'),
    bindings: {
        categoryTitle: '@',
        reviews: '<',
        allDone: '<',
        onSelection: '&',
    },
    controller: class QuestionFlowCategoryComponentController implements angular.IComponentController {
        categoryTitle: string;
        reviews: QuestionReview[];
        allDone: boolean;
        onSelection: (_: { review: QuestionReview }) => any;

        constructor(
            private $sce: angular.ISCEService,
            private QuestionReview: QuestionReviewService,
            private Session: SessionService,
        ) {
            'ngInject';
        }

        displayQuestionText = (review: QuestionReview) => {
            const text = truncate(review.question.question, 50);
            return this.$sce.trustAsHtml(text);
        };

        isFinalized = (review: QuestionReview) => this.QuestionReview.isFinalized(review);

        getAssessedAnswerCount = (review: QuestionReview) =>
            this.allDone ? 0 : this.QuestionReview.getProcessedAnswerCount(review, this.Session.getUser());

        selectQuestion = (review: QuestionReview) => this.onSelection({ review: review });
    },
};

angular.module('app.review').component('questionFlowCategory', QuestionFlowCategoryComponent);
