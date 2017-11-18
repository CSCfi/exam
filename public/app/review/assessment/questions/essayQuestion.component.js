'use strict';

angular.module('app.review')
    .component('rEssayQuestion', {
        templateUrl: '/assets/app/review/assessment/questions/essayQuestion.template.html',
        bindings: {
            exam: '<',
            sectionQuestion: '<',
            isScorable: '<',
            onScore: '&'
        },
        controller: ['$sce', '$translate', 'Assessment', 'Attachment', 'toast',
            function ($sce, $translate, Assessment, Attachment, toast) {

                var vm = this;

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
