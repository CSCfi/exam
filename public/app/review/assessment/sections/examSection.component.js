'use strict';

angular.module('app.review')
    .component('rExamSection', {
        templateUrl: '/assets/app/review/assessment/sections/examSection.template.html',
        bindings: {
            exam: '<',
            section: '<',
            isScorable: '<',
            index: '<',
            onScore: '&'
        },
        controller: ['$sce', 'Attachment',
            function ($sce, Attachment) {

                var vm = this;

                vm.scoreSet = function() {
                    vm.onScore();
                };

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
