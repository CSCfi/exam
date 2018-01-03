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
import toast from 'toastr';

angular.module('app.review')
    .component('rEssayQuestion', {
        template: require('./essayQuestion.template.html'),
        bindings: {
            exam: '<',
            sectionQuestion: '<',
            isScorable: '<',
            onScore: '&'
        },
        controller: ['$sce', '$translate', 'Assessment', 'Attachment',
            function ($sce, $translate, Assessment, Attachment) {

                const vm = this;

                vm.displayQuestionText = function () {
                    return $sce.trustAsHtml(vm.sectionQuestion.question.question);
                };

                vm.downloadQuestionAttachment = function () {
                    return Attachment.downloadQuestionAttachment(vm.sectionQuestion.question);
                };

                vm.downloadQuestionAnswerAttachment = function () {
                    return Attachment.downloadQuestionAnswerAttachment(vm.sectionQuestion, vm.exam.hash);
                };

                vm.insertEssayScore = function () {
                    Assessment.saveEssayScore(vm.sectionQuestion)
                        .then(function () {
                            toast.info($translate.instant('sitnet_graded'));
                            vm.onScore();
                        }, function (error) {
                            toast.error(error.data);
                        });
                };

                vm.getWordCount = function () {
                    if (!vm.sectionQuestion.essayAnswer) {
                        return 0;
                    }
                    return Assessment.countWords(vm.sectionQuestion.essayAnswer.answer);
                };

                vm.getCharacterCount = function () {
                    if (!vm.sectionQuestion.essayAnswer) {
                        return 0;
                    }
                    return Assessment.countCharacters(vm.sectionQuestion.essayAnswer.answer);
                };

            }
        ]
    });
