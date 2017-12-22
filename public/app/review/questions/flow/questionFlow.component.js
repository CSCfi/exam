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
