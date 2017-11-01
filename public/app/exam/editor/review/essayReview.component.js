'use strict';

angular.module('app.exam.editor')
    .component('essayReview', {
        templateUrl: '/assets/app/exam/editor/review/essayReview.template.html',
        bindings: {
            review: '<',
            onSelection: '&'
        },
        controller: ['$sce',
            function ($sce) {

                var vm = this;

                vm.getAssessedAnswerCount = function () {
                    return vm.review.answers.filter(function (a) {
                        return a.essayAnswer && a.essayAnswer.evaluatedScore >= 0;
                    }).length;
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
