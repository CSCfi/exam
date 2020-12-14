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

angular.module('app.enrolment').component('examFeedback', {
    template: require('./examFeedback.template.html'),
    bindings: {
        assessment: '<',
        scores: '<',
        collaborative: '<',
    },
    controller: [
        '$translate',
        '$filter',
        'Attachment',
        'Files',
        function($translate, $filter, Attachment, Files) {
            const vm = this;

            vm.downloadFeedbackAttachment = function() {
                if (vm.collaborative) {
                    const attachment = vm.assessment.examFeedback.attachment;
                    Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName);
                } else {
                    Attachment.downloadFeedbackAttachment(vm.assessment);
                }
            };

            vm.downloadStatementAttachment = function() {
                Attachment.downloadStatementAttachment(vm.assessment);
            };

            vm.downloadScoreReport = function() {
                const url = `/app/feedback/exams/${vm.assessment.id}/report`;
                Files.download(
                    url,
                    vm.assessment.name + '_' + $filter('date')(Date.now(), 'dd-MM-yyyy') + '.xlsx',
                    null,
                    false,
                );
            };
        },
    ],
});
