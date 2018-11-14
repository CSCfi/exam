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

angular.module('app.examination')
    .component('examinationQuestion', {
        template: require('./examinationQuestion.template.html'),
        bindings: {
            exam: '<',
            sq: '<',
            isPreview: '<',
            isCollaborative: '<'
        },
        controller: ['$sce', '$filter', 'Examination', 'Attachment',
            function ($sce, $filter, Examination, Attachment) {

                const vm = this;

                vm.$onInit = function () {
                    vm.sq.expanded = true;
                    const answerData = vm.sq.clozeTestAnswer;
                    if (answerData && typeof answerData.answer === 'string') {
                        answerData.answer = JSON.parse(answerData.answer);
                    }
                };

                vm.displayQuestionText = function (truncated) {
                    const text = truncated ? truncate(vm.sq.question.question, 240) : vm.sq.question.question;
                    return $sce.trustAsHtml(text);
                };

                vm.downloadQuestionAttachment = function () {
                    if (vm.exam.external) {
                        Attachment.downloadExternalQuestionAttachment(vm.exam, vm.sq);
                        return;
                    } else if (vm.isCollaborative) {
                        Attachment.downloadCollaborativeQuestionAttachment(vm.exam.id, vm.sq);
                        return;
                    }
                    Attachment.downloadQuestionAttachment(vm.sq.question);
                };

                vm.isAnswered = function () {
                    return Examination.isAnswered(vm.sq);
                };

                const truncate = function (content, offset) {
                    return $filter('truncate')(content, offset);
                };


            }
        ]
    });
