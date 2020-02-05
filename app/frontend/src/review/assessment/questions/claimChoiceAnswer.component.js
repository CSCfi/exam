/*
 * Copyright (c) 2019 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

angular.module('app.review').component('rClaimChoiceAnswer', {
    template: require('./claimChoiceAnswer.template.html'),
    bindings: {
        sectionQuestion: '<',
    },
    controller: [
        function() {
            const vm = this;

            vm.getSelectedOptionClass = function(esqOption) {
                const { answered = false, option = null } = esqOption;

                if (!answered || !(option && option.claimChoiceType)) {
                    return 'exam-not-answered';
                }

                switch (option.claimChoiceType) {
                    case 'CorrectOption':
                        return 'exam-answered-correct';
                    case 'IncorrectOption':
                        return 'exam-answered-wrong';
                    case 'SkipOption':
                        return 'exam-answered-skip';
                    default:
                        return 'exam-not-answered';
                }
            };
        },
    ],
});
