/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';

angular.module('app.review')
    .component('rStatement', {
        templateUrl: '/assets/app/review/assessment/feedback/statement.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$uibModal', 'Maturity', 'Attachment', 'Files',
            function ($modal, Maturity, Attachment, Files) {

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
                    }).result.then(function (fileData) {
                        Maturity.saveInspectionStatement(vm.exam).then(function (data) {
                            angular.extend(vm.exam.languageInspection.statement, data);
                            Files.upload('/app/attachment/exam/' + vm.exam.id + '/statement',
                                fileData.attachmentFile, {examId: vm.exam.id}, vm.exam.languageInspection.statement);
                        });
                    });
                };


            }

        ]
    });
