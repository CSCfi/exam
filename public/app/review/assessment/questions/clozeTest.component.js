'use strict';

angular.module('app.review')
    .component('rClozeTest', {
        templateUrl: '/assets/app/review/assessment/questions/clozeTest.template.html',
        bindings: {
            sectionQuestion: '<'
        },
        controller: ['$sce', 'Attachment',
            function ($sce, Attachment) {

                var vm = this;

                vm.displayQuestionText = function () {
                    return $sce.trustAsHtml(vm.sectionQuestion.question.question);
                };

                vm.downloadQuestionAttachment = function () {
                    return Attachment.downloadQuestionAttachment(vm.sectionQuestion.question);
                };

                vm.displayClozeTestScore = function () {
                    var max = vm.sectionQuestion.maxScore;
                    var score = vm.sectionQuestion.clozeTestAnswer.score;
                    return score.correctAnswers * max / (score.correctAnswers + score.incorrectAnswers).toFixed(2)
                        + ' / ' + max;
                };
            }
        ]
    });
