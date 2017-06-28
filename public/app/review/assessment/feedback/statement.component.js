'use strict';

angular.module('app.review')
    .component('rStatement', {
        templateUrl: '/assets/app/review/assessment/feedback/statement.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$uibModal', 'Maturity', 'Attachment', 'fileService',
            function ($modal, Maturity, Attachment, fileService) {

                var vm = this;

                vm.hasGoneThroughLanguageInspection = function () {
                    return vm.exam.languageInspection && vm.exam.languageInspection.finishedAt;
                };

                vm.toggleEditorVisibility = function () {
                    var selector = $('.body');
                    if (vm.hideEditor) {
                        selector.show();
                    } else {
                        selector.hide();
                    }
                    vm.hideEditor = !vm.hideEditor;
                };

                vm.saveInspectionStatement = function () {
                    Maturity.saveInspectionStatement(vm.exam).then(function (data) {
                        angular.extend(vm.exam.languageInspection.statement, data);
                    });
                };

                vm.downloadStatementAttachment = function () {
                    Attachment.downloadStatementAttachment(vm.exam);
                };

                vm.removeStatementAttachment = function () {
                    Attachment.removeStatementAttachment(vm.exam);
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
                        fileService.upload('/app/attachment/exam/' + vm.exam.id + '/statement',
                            data.attachmentFile, {examId: vm.exam.id}, vm.exam.languageInspection.statement);
                    });
                };


            }

        ]
    });
