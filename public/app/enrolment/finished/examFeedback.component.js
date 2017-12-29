'use strict';
angular.module('app.enrolment')
    .component('examFeedback', {
        templateUrl: '/assets/app/enrolment/finished/examFeedback.template.html',
        bindings: {
            assessment: '<',
            scores: '<'
        },
        controller: ['Attachment',
            function (Attachment) {

                var vm = this;

                vm.downloadFeedbackAttachment = function () {
                    Attachment.downloadFeedbackAttachment(vm.assessment);
                };

                vm.downloadStatementAttachment = function () {
                    Attachment.downloadStatementAttachment(vm.assessment);
                }

            }

        ]
    });




