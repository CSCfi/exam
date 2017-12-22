'use strict';

angular.module('app.review')
    .component('rMultiChoiceQuestion', {
        templateUrl: '/assets/app/review/assessment/questions/multiChoiceQuestion.template.html',
        bindings: {
            sectionQuestion: '<'
        },
        controller: ['$sce', 'Attachment', 'Question', 'EXAM_CONF',
            function ($sce, Attachment, Question, EXAM_CONF) {

                var vm = this;

                vm.$onInit = function () {
                    var path = EXAM_CONF.TEMPLATES_PATH + 'review/assessment/questions/';
                    vm.templates = {
                        multiChoiceAnswer: path + 'multiChoiceAnswer.template.html',
                        weightedMultiChoiceAnswer: path + 'weightedMultiChoiceAnswer.template.html'
                    };
                };

                vm.scoreWeightedMultipleChoiceAnswer = function () {
                    if (vm.sectionQuestion.question.type !== 'WeightedMultipleChoiceQuestion') {
                        return 0;
                    }
                    return Question.scoreWeightedMultipleChoiceAnswer(vm.sectionQuestion);
                };

                vm.scoreMultipleChoiceAnswer = function () {
                    if (vm.sectionQuestion.question.type !== 'MultipleChoiceQuestion') {
                        return 0;
                    }
                    return Question.scoreMultipleChoiceAnswer(vm.sectionQuestion);
                };

                vm.calculateMaxPoints = function () {
                    return Question.calculateMaxPoints(vm.sectionQuestion);
                };

                vm.displayQuestionText = function () {
                    return $sce.trustAsHtml(vm.sectionQuestion.question.question);
                };

                vm.downloadQuestionAttachment = function () {
                    return Attachment.downloadQuestionAttachment(vm.sectionQuestion.question);
                };


            }
        ]
    });
