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
    .component('questionReviews', {
        templateUrl: '/assets/app/review/questions/listing/questionReviews.template.html',
        bindings: {
            examId: '<'
        },
        controller: ['$location', 'QuestionReview',
            function ($location, QuestionReview) {

                var vm = this;

                vm.$onInit = function () {
                    vm.reviews = QuestionReview.questionsApi.query({id: vm.examId});
                    vm.selectedReviews = [];
                    vm.selectionToggle = false;
                };

                vm.onReviewSelection = function (id, selected) {
                    var index = vm.selectedReviews.indexOf(id);
                    if (selected && index === -1) {
                        vm.selectedReviews.push(id);
                    } else if (index > -1) {
                        vm.selectedReviews.splice(index, 1);
                    }
                };

                var removeSelections = function () {
                    vm.reviews.forEach(function (r) {
                        r.selected = false;
                    });
                    vm.selectedReviews = [];
                };

                var addSelections = function () {
                    vm.reviews.forEach(function (r) {
                        r.selected = true;
                    });
                    vm.selectedReviews = vm.reviews.map(function (r) {
                        return r.question.id;
                    });
                };

                vm.selectAll = function () {
                    vm.selectionToggle ? addSelections() : removeSelections();
                };

                vm.startReview = function () {
                    $location.path('/assessments/' + vm.examId + '/questions').search('q', vm.selectedReviews);
                }

            }
        ]
    });
