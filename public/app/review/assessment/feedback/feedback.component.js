'use strict';

angular.module('app.review')
    .component('rFeedback', {
        templateUrl: '/assets/app/review/assessment/feedback/feedback.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$uibModal', 'Assessment', 'Attachment', 'fileService',
            function ($modal, Assessment, Attachment, fileService) {

                var vm = this;

                vm.toggleFeedbackVisibility = function () {
                    var selector = $('.body');
                    if (vm.hideEditor) {
                        selector.show();
                    } else {
                        selector.hide();
                    }
                    vm.hideEditor = !vm.hideEditor;
                };

                vm.saveFeedback = function () {
                    Assessment.saveFeedback(vm.exam);
                };

                vm.downloadFeedbackAttachment = function () {
                    Attachment.downloadFeedbackAttachment(vm.exam);
                };

                vm.removeFeedbackAttachment = function () {
                    Attachment.removeFeedbackAttachment(vm.exam);
                };

                vm.selectFile = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'attachmentSelector',
                        resolve: {
                            isTeacherModal: function () {
                                return true;
                            }
                        }
                    }).result.then(function (data) {
                        fileService.upload('/app/attachment/exam/' + vm.exam.id + '/feedback',
                            data.attachmentFile, {examId: vm.exam.id}, vm.exam.examFeedback);
                    });
                };


            }

        ]
    });
