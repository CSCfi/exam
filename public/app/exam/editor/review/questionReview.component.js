'use strict';

angular.module('app.exam.editor')
    .component('questionReview', {
        templateUrl: '/assets/app/exam/editor/review/questionReview.template.html',
        bindings: {
            exam: '<',
            onPreviousTabSelected: '&',
            onNextTabSelected: '&?'
        },
        controller: ['QuestionReview',
            function (QuestionReview) {

                var vm = this;

                vm.$onInit = function () {
                    vm.questions = QuestionReview.questionsApi.query({id: vm.exam.id});
                };



            }
        ]
    });
