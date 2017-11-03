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
