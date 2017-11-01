'use strict';

angular.module('app.exam.editor')
    .component('questionReview', {
        templateUrl: '/assets/app/exam/editor/review/questionReview.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['QuestionReview',
            function (QuestionReview) {

                var vm = this;

                vm.$onInit = function () {
                    vm.reviews = QuestionReview.questionsApi.query({id: vm.exam.id});
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

            }
        ]
    });
