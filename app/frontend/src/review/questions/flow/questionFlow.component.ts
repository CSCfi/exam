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

export const QuestionFlowComponent: angular.IComponentOptions = {
    template: require('./questionFlow.template.html'),
    bindings: {
        reviews: '<',
        onSelection: '&'
    },
    controller: class QuestionFlowComponentController implements angular.IComponentController {

        reviews: QuestionReview[];
        onSelection: (_: { index: number }) => any;
        unfinished: QuestionReview[];
        finished: QuestionReview[];

        constructor(private QuestionReview: QuestionReviewService) {
            'ngInject';
        }

        private init = () => {
            this.unfinished = this.reviews.filter(r => !this.QuestionReview.isFinalized(r));
            this.finished = this.reviews.filter(this.QuestionReview.isFinalized);
        }

        $onInit() {
            this.init();
        }

        $onChanges(props: angular.IOnChangesObject) {
            if (props.reviews) {
                this.init();
            }
        }

        questionSelected = (review: QuestionReview) => {
            this.unfinished.concat(this.finished)
                .forEach(r => r.selected = r.question.id === review.question.id);
            this.onSelection({ index: this.reviews.indexOf(review) });
        }

    }
};

angular.module('app.review').component('questionFlow', QuestionFlowComponent);
