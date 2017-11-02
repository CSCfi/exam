'use strict';

angular.module('app.review')
    .component('questionFlowCategory', {
        templateUrl: '/assets/app/review/questions/flow/questionFlowCategory.template.html',
        bindings: {
            categoryTitle: '@',
            reviews: '<',
            onSelection: '&'
        },
        controller: ['$sce', '$filter', 'QuestionReview',
            function ($sce, $filter, QuestionReview) {

                var vm = this;

                vm.$onInit = function () {
                    console.log(vm.reviews.length);
                };

                vm.displayQuestionText = function (review) {
                    var truncate = function (content, offset) {
                        return $filter('truncate')(content, offset);
                    };

                    var text = truncate(review.question.question, 50);
                    return $sce.trustAsHtml(text);
                };

                vm.isFinalized = function (review) {
                    return QuestionReview.isFinalized(review);
                };

                vm.getAssessedAnswerCount = function (review) {
                    return QuestionReview.getAssessedAnswerCount(review);
                };

                vm.selectQuestion = function(review) {
                    vm.onSelection({review: review});
                }


            }


        ]
    });
