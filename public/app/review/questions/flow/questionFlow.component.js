/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

'use strict';

angular.module('app.review')
    .component('questionFlow', {
        templateUrl: '/assets/app/review/questions/flow/questionFlow.template.html',
        bindings: {
            reviews: '<',
            onSelection: '&'
        },
        controller: ['QuestionReview',
            function (QuestionReview) {

                var vm = this;

                var init = function () {
                    vm.unfinished = vm.reviews.filter(function(r) {
                        return !QuestionReview.isFinalized(r);
                    });
                    vm.finished = vm.reviews.filter(QuestionReview.isFinalized);
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
                    vm.onSelection({index: vm.reviews.indexOf(review)});
                }

            }


        ]
    });
