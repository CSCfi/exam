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
        controller: ['$sce', '$translate', 'Assessment', 'Attachment', 'Question',
            function ($sce, $translate, Assessment, Attachment, Question) {

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
                    var answer = vm.sectionQuestion.essayAnswer;
                    if (!answer || isNaN(answer.evaluatedScore)) {
                        return;
                    }

                    Question.essayScoreApi.update({
                        id: vm.sectionQuestion.id,
                        evaluatedScore: answer.evaluatedScore
                    }, function () {
                        toastr.info($translate.instant('sitnet_graded'));
                        vm.onScore();
                    }, function (error) {
                        toastr.error(error.data);
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
