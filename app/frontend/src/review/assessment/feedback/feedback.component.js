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

import angular from 'angular';

angular.module('app.review')
    .component('rFeedback', {
        template: require('./feedback.template.html'),
        bindings: {
            exam: '<'
        },
        controller: ['$uibModal', 'Assessment', 'Attachment', 'Files',
            function ($modal, Assessment, Attachment, Files) {

                const vm = this;

                vm.toggleFeedbackVisibility = function () {
                    const selector = $('.body');
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
                        Assessment.saveFeedback(vm.exam).then(function () {
                            Files.upload('/app/attachment/exam/' + vm.exam.id + '/feedback',
                                data.attachmentFile, {examId: vm.exam.id}, vm.exam.examFeedback);
                        })
                    });
                };
            }

        ]
    });
