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

'use strict';

angular.module('app.examination')
    .component('examinationEssayQuestion', {
        templateUrl: '/assets/app/examination/question/examinationEssayQuestion.template.html',
        bindings: {
            sq: '<',
            examHash: '<',
            isPreview: '<'
        },
        controller: ['Examination', 'Attachment', 'Files',
            function (Examination, Attachment, Files) {

                var vm = this;

                vm.$onInit = function () {
                    Examination.setQuestionColors(vm.sq);
                };

                vm.saveAnswer = function () {
                    Examination.saveTextualAnswer(vm.sq, vm.examHash, false);
                };

                vm.removeQuestionAnswerAttachment = function () {
                    Attachment.removeQuestionAnswerAttachment(vm.sq.question, vm.examHash);
                };

                vm.selectFile = function () {
                    if (vm.isPreview) {
                        return;
                    }
                    Attachment.selectFile(false).then(function (data) {
                        Files.uploadAnswerAttachment('/app/attachment/question/answer', data.attachmentFile,
                            {questionId: vm.sq.id, answerId: vm.sq.essayAnswer.id}, vm.sq.essayAnswer);
                    });
                };
            }
        ]
    });
