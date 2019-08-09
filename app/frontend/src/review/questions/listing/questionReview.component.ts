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

export const QuestionReviewComponent: angular.IComponentOptions = {
    template: require('./questionReview.template.html'),
    bindings: {
        review: '<',
        onSelection: '&'
    },
    controller: class QuestionReviewControllers implements angular.IComponentController {
        review: QuestionReview;
        onSelection: (_: { id: number, selected: boolean }) => any;

        constructor(private $sce: angular.ISCEService,
            private QuestionReview: QuestionReviewService,
            private Session: SessionService
        ) {
            'ngInject';
        }

        getAssessedAnswerCount = () => this.QuestionReview.getProcessedAnswerCount(this.review, this.Session.getUser());

        sanitizeQuestion = () => this.$sce.trustAsHtml(this.review.question.question);

        reviewSelected = () => this.onSelection({ id: this.review.question.id, selected: this.review.selected });
    }
};

angular.module('app.review').component('questionReview', QuestionReviewComponent);
