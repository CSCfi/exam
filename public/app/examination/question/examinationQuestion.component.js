'use strict';

angular.module('app.examination')
    .component('examinationQuestion', {
        templateUrl: '/assets/app/examination/question/examinationQuestion.template.html',
        bindings: {
            examHash: '<',
            sq: '<',
            isPreview: '<'
        },
        controller: ['$sce', '$filter', 'Attachment',
            function ($sce, $filter, Attachment) {

                var vm = this;

                vm.$onInit = function () {
                    vm.sq.expanded = true;
                };

                vm.displayQuestionText = function (truncated) {
                    var text = truncated ? truncate(vm.sq.question.question, 240) : vm.sq.question.question;
                    return $sce.trustAsHtml(text);
                };

                vm.downloadQuestionAttachment = function () {
                    Attachment.downloadQuestionAttachment(vm.sq.question);
                };

                var truncate = function (content, offset) {
                    return $filter('truncate')(content, offset);
                };


            }
        ]
    });
