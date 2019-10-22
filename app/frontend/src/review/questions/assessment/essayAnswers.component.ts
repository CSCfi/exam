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
import { ReviewQuestion } from '../../review.model';
import { QuestionReviewService } from '../questionReview.service';

export const EssayAnswerListComponent: angular.IComponentOptions = {
    template: `<div class="top-row">
            <div class="col-md-12" ng-repeat="answer in $ctrl.answers">
                <essay-answer answer="answer" editable="$ctrl.editable" action="{{$ctrl.actionText}}"
                    on-selection="$ctrl.assessEssay(answer)"></essay-answer>
            </div>
            <div ng-if="$ctrl.answers.length === 0" class="col-md-12">
                <div class="jumbotron padl20"><p class="lead">{{'sitnet_no_answers_to_assess' | translate }}</p></div>
            </div>
            <div ng-if="$ctrl.answers.length > 0" class="col-md-12 mart20 marb30">
                <button class="btn btn-success" ng-click="$ctrl.assessSelected()">
                    {{ $ctrl.actionText | translate }} ({{$ctrl.countSelected()}})</button>
            </div>
        </div>`,
    bindings: {
        editable: '<',
        answers: '<',
        isPremature: '<',
        actionText: '@',
        onAssessed: '&',
    },
    controller: class EssayAnswerListComponentController implements angular.IComponentController {
        answers: ReviewQuestion[];
        editable: boolean;
        isPremature: boolean;
        actionText: string;
        onAssessed: (_: { answers: ReviewQuestion[] }) => any;

        constructor(private QuestionReview: QuestionReviewService) {
            'ngInject';
        }

        countSelected = () => {
            if (!this.answers) {
                return 0;
            }
            return this.answers.filter(this.QuestionReview.isAssessed).length;
        };

        assessSelected = () => this.onAssessed({ answers: this.answers.filter(this.QuestionReview.isAssessed) });

        assessEssay = (answer: ReviewQuestion) => {
            if (this.QuestionReview.isAssessed(answer)) {
                this.onAssessed({ answers: [answer] });
            }
        };
    },
};

angular.module('app.review').component('essayAnswers', EssayAnswerListComponent);
