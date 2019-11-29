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

angular.module('app.review').component('rFeedback', {
    template: require('./feedback.template.html'),
    bindings: {
        exam: '<',
    },
    require: {
        parentCtrl: '^^assessment',
    },
    controller: [
        '$uibModal',
        '$stateParams',
        'Assessment',
        'CollaborativeAssessment',
        'Attachment',
        'Files',
        function($modal, $stateParams, Assessment, CollaborativeAssessment, Attachment, Files) {
            const vm = this;

            vm.toggleFeedbackVisibility = function() {
                const selector = $('.body');
                if (vm.hideEditor) {
                    selector.show();
                } else {
                    selector.hide();
                }
                vm.hideEditor = !vm.hideEditor;
            };

            vm.saveFeedback = function() {
                return new Promise(resolve => {
                    if (vm.parentCtrl.collaborative) {
                        CollaborativeAssessment.saveFeedback(
                            $stateParams.id,
                            $stateParams.ref,
                            vm.parentCtrl.participation,
                        ).then(resolve);
                    } else {
                        Assessment.saveFeedback(vm.exam).then(resolve);
                    }
                });
            };

            vm.downloadFeedbackAttachment = function() {
                const attachment = vm.exam.examFeedback.attachment;
                vm.parentCtrl.collaborative
                    ? Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName)
                    : Attachment.downloadFeedbackAttachment(vm.exam);
            };

            vm.removeFeedbackAttachment = function() {
                if (vm.parentCtrl.collaborative) {
                    Attachment.removeExternalFeedbackAttachment(
                        $stateParams.id,
                        $stateParams.ref,
                        vm.parentCtrl.participation,
                    );
                } else {
                    Attachment.removeFeedbackAttachment(vm.exam);
                }
            };

            vm.selectFile = function() {
                $modal
                    .open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'attachmentSelector',
                        resolve: {
                            isTeacherModal: function() {
                                return true;
                            },
                        },
                    })
                    .result.then(function(data) {
                        vm.saveFeedback().then(function() {
                            const url = vm.parentCtrl.collaborative
                                ? `/integration/iop/attachment/exam/${$stateParams.id}/${$stateParams.ref}/feedback`
                                : `/app/attachment/exam/${vm.exam.id}/feedback`;
                            Files.upload(url, data.attachmentFile, { examId: vm.exam.id }, vm.exam.examFeedback, () => {
                                // kinda hacky, but let's do this mangling for time being
                                vm.parentCtrl.participation._rev = vm.exam.examFeedback.attachment.rev;
                                delete vm.exam.examFeedback.attachment.rev;
                            });
                        });
                    });
            };
        },
    ],
});
