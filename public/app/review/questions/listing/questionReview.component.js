'use strict';

angular.module('app.exam.editor')
    .component('questionReview', {
        templateUrl: '/assets/app/review/questions/listing/questionReview.template.html',
        bindings: {
            review: '<',
            onSelection: '&'
        },
        controller: ['$sce', 'QuestionReview',
            function ($sce, QuestionReview) {

                var vm = this;

                vm.getAssessedAnswerCount = function () {
                    return QuestionReview.getAssessedAnswerCount(vm.review);
                };

                vm.sanitizeQuestion = function () {
                    return $sce.trustAsHtml(vm.review.question.question);
                };

                vm.reviewSelected = function () {
                    vm.onSelection({id: vm.review.question.id, selected: vm.review.selected});
                };


            }
        ]
    });
