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
    .component('rExamSection', {
        template: require('./examSection.template.html'),
        bindings: {
            exam: '<',
            section: '<',
            isScorable: '<',
            index: '<',
            onScore: '&'
        },
        controller: ['$sce', 'Attachment',
            function ($sce, Attachment) {

                const vm = this;

                vm.scoreSet = function () {
                    vm.onScore();
                };

                vm.displayQuestionText = function () {
                    return $sce.trustAsHtml(vm.sectionQuestion.question.question);
                };

                vm.downloadQuestionAttachment = function () {
                    return Attachment.downloadQuestionAttachment(vm.sectionQuestion.question);
                };

                vm.displayClozeTestScore = function () {
                    const max = vm.sectionQuestion.maxScore;
                    const score = vm.sectionQuestion.clozeTestAnswer.score;
                    return score.correctAnswers * max / (score.correctAnswers + score.incorrectAnswers).toFixed(2)
                        + ' / ' + max;
                };
            }
        ]
    });
