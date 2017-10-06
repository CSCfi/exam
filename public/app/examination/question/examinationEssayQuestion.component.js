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
