/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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
import _ from 'lodash';

angular.module('app.review').component('printedMultiChoice', {
    template: require('./templates/multiChoice.html'),
    bindings: {
        sectionQuestion: '<',
    },
    controller: [
        'Question',
        function(Question) {
            const vm = this;

            vm.scoreWeightedMultipleChoiceAnswer = function(ignoreForcedScore) {
                if (vm.sectionQuestion.question.type !== 'WeightedMultipleChoiceQuestion') {
                    return 0;
                }
                return Question.scoreWeightedMultipleChoiceAnswer(vm.sectionQuestion, ignoreForcedScore);
            };

            vm.scoreMultipleChoiceAnswer = function(ignoreForcedScore) {
                if (vm.sectionQuestion.question.type !== 'MultipleChoiceQuestion') {
                    return 0;
                }
                return Question.scoreMultipleChoiceAnswer(vm.sectionQuestion, ignoreForcedScore);
            };

            vm.scoreClaimChoiceAnswer = function(ignoreForcedScore) {
                if (vm.sectionQuestion.question.type !== 'ClaimChoiceQuestion') {
                    return 0;
                }
                return Question.scoreClaimChoiceAnswer(vm.sectionQuestion, ignoreForcedScore);
            };

            vm.calculateMaxPoints = function() {
                return Question.calculateMaxPoints(vm.sectionQuestion);
            };

            vm.getCorrectClaimChoiceOptionScore = function() {
                return Question.getCorrectClaimChoiceOptionScore(vm.sectionQuestion);
            };

            vm.hasForcedScore = () => _.isNumber(vm.sectionQuestion.forcedScore);
        },
    ],
});