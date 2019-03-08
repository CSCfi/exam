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

import angular from 'angular';

angular.module('app.review')
    .component('questionFlowCategory', {
        template: require('./questionFlowCategory.template.html'),
        bindings: {
            categoryTitle: '@',
            reviews: '<',
            allDone: '<',
            onSelection: '&'
        },
        controller: ['$sce', '$filter', 'Session', 'QuestionReview',
            function ($sce, $filter, Session, QuestionReview) {

                const vm = this;

                vm.$onChanges = function (changes) {
                    if (changes.reviews) {
                        console.log("Reviews changed!");
                    }
                }

                vm.displayQuestionText = function (review) {
                    const truncate = function (content, offset) {
                        return $filter('truncate')(content, offset);
                    };

                    const text = truncate(review.question.question, 50);
                    return $sce.trustAsHtml(text);
                };

                vm.isFinalized = function (review) {
                    return QuestionReview.isFinalized(review);
                };

                vm.getAssessedAnswerCount = function (review) {
                    return vm.allDone ? 0 : QuestionReview.getProcessedAnswerCount(review, Session.getUser());
                };

                vm.selectQuestion = function (review) {
                    vm.onSelection({ review: review });
                };


            }


        ]
    });
