'use strict';
angular.module('app.review')
    .component('essayAnswer', {
        templateUrl: '/assets/app/review/questions/assessment/essayAnswer.template.html',
        bindings: {
            answer: '<',
            editable: '<',
            action: '@',
            onSelection: '&'
        },
        controller: ['Assessment',
            function (Assessment) {

                var vm = this;

                vm.$onInit = function () {
                    vm.answer.expanded = true;
                    vm.answer.essayAnswer = vm.answer.essayAnswer || {};
                    vm.answer.essayAnswer.score = vm.answer.essayAnswer.evaluatedScore;
                };

                vm.getWordCount = function() {
                    return Assessment.countWords(vm.answer.essayAnswer.answer);
                };

                vm.getCharacterCount = function () {
                    return Assessment.countCharacters(vm.answer.essayAnswer.answer);
                };

                vm.saveScore = function () {
                    vm.onSelection({answer: vm.answer});
                };

                vm.isAssessed = function () {
                    return vm.answer.essayAnswer && parseFloat(vm.answer.essayAnswer.score) >= 0;
                }

            }
        ]
    });
