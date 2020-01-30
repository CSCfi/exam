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
import * as toast from 'toastr';

import { QuestionReview } from '../../review.model';
import { QuestionReviewService } from '../questionReview.service';

export const QuestionReviewListComponent: angular.IComponentOptions = {
    template: require('./questionReviews.template.html'),
    bindings: {
        examId: '<',
    },
    controller: class QuestionReviewListComponentController implements angular.IComponentController {
        examId: number;
        reviews: QuestionReview[];
        selectedReviews: number[] = [];
        selectionToggle = false;

        constructor(private $location: angular.ILocationService, private QuestionReview: QuestionReviewService) {
            'ngInject';
        }

        $onInit() {
            this.QuestionReview.getReviews(this.examId)
                .then(resp => {
                    this.reviews = resp;
                })
                .catch(err => toast.error(err));
        }

        onReviewSelection = (id: number, selected: boolean) => {
            const index = this.selectedReviews.indexOf(id);
            if (selected && index === -1) {
                this.selectedReviews.push(id);
            } else if (index > -1) {
                this.selectedReviews.splice(index, 1);
            }
        };

        removeSelections = () => {
            this.reviews.forEach(r => (r.selected = false));
            this.selectedReviews = [];
        };

        addSelections = () => {
            this.reviews.forEach(r => (r.selected = true));
            this.selectedReviews = this.reviews.map(r => r.question.id);
        };

        selectAll = () => (this.selectionToggle ? this.addSelections() : this.removeSelections());

        startReview = () =>
            this.$location.path(`/assessments/${this.examId}/questions`).search(
                'q',
                this.selectedReviews.map(i => i.toString()),
            );
    },
};

angular.module('app.review').component('questionReviews', QuestionReviewListComponent);
