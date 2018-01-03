/*
 * Copyright (c) 2017 Exam Consortium
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

import angular from 'angular';

angular.module('app.review')
    .component('essayAnswer', {
        template: require('./essayAnswer.template.html'),
        bindings: {
            answer: '<',
            editable: '<',
            action: '@',
            onSelection: '&'
        },
        controller: ['Assessment',
            function (Assessment) {

                const vm = this;

                vm.$onInit = function () {
                    vm.answer.expanded = true;
                    vm.answer.essayAnswer = vm.answer.essayAnswer || {};
                    vm.answer.essayAnswer.score = vm.answer.essayAnswer.evaluatedScore;
                };

                vm.getWordCount = function () {
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
                };

                vm.displayMaxScore = function () {
                    return vm.answer.evaluationType === 'Points' ? vm.answer.maxScore : 1;
                };

            }
        ]
    });
