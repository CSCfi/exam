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
    .component('questionFlow', {
        template: require('./questionFlow.template.html'),
        bindings: {
            reviews: '<',
            onSelection: '&'
        },
        controller: ['QuestionReview', 'Session',
            function (QuestionReview, Session) {

                const vm = this;

                const init = function () {
                    vm.unfinished = vm.reviews.filter(function (r) {
                        return vm.getAssessedAnswerCount(r) < r.answers.length;
                    });
                    vm.finished = vm.reviews.filter(function (r) {
                        return vm.getAssessedAnswerCount(r) === r.answers.length;
                    });
                };

                vm.getAssessedAnswerCount = function (review) {
                    return QuestionReview.getProcessedAnswerCount(review, Session.getUser());
                };

                vm.$onInit = function () {
                    init();
                };

                vm.$onChanges = function (props) {
                    if (props.reviews) {
                        init();
                    }
                };

                vm.questionSelected = function (review) {
                    vm.unfinished.concat(vm.finished).forEach(function (r) {
                        r.selected = r.question.id === review.question.id;
                    });
                    vm.onSelection({ index: vm.reviews.indexOf(review) });
                };

            }


        ]
    });
