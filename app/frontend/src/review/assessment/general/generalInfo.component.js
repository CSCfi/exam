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
import moment from 'moment';

angular.module('app.review').component('rGeneralInfo', {
    template: require('./generalInfo.template.html'),
    bindings: {
        exam: '<',
        participation: '<',
        collaborative: '<',
    },
    controller: [
        'Attachment',
        'Assessment',
        '$stateParams',
        function(Attachment, Assessment, $stateParams) {
            const vm = this;

            vm.$onInit = function() {
                const duration = moment.utc(new Date(vm.participation.duration));
                if (duration.second() > 29) {
                    duration.add(1, 'minutes');
                }
                vm.participation.duration = duration.format('HH:mm');

                vm.student = vm.participation.user;
                vm.studentName = vm.student
                    ? `${vm.student.lastName} ${vm.student.firstName}`
                    : vm.collaborative
                    ? vm.participation._id
                    : vm.exam.id;
                vm.enrolment = vm.exam.examEnrolments[0];
                vm.reservation = vm.enrolment.reservation;
                vm.config = vm.enrolment.examinationEventConfiguration;
                const params = {
                    eid: vm.exam.id,
                };
                let participationsApi = Assessment.participationsApi;
                if (vm.collaborative) {
                    participationsApi = Assessment.collaborativeParticipationsApi;
                    params.eid = $stateParams.id;
                    params.aid = $stateParams.ref;
                }
                participationsApi.query(params, handleParticipations);
            };

            vm.downloadExamAttachment = function() {
                if (vm.collaborative) {
                    const attachment = vm.exam.attachment;
                    Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName);
                    return;
                }
                Attachment.downloadExamAttachment(vm.exam);
            };

            function handleParticipations(data) {
                if (vm.collaborative) {
                    //TODO: Add collaborative support for noshows.
                    vm.previousParticipations = data;
                    return;
                }
                // Filter out the participation we are looking into
                const previousParticipations = data.filter(function(p) {
                    return p.id !== vm.participation.id;
                });
                Assessment.noShowApi.query({ eid: vm.exam.id }, function(data) {
                    const noShows = data.map(function(d) {
                        return {
                            noShow: true,
                            started: d.reservation
                                ? d.reservation.startAt
                                : d.examinationEventConfiguration.examinationEvent.start,
                            exam: { state: 'no_show' },
                        };
                    });
                    vm.previousParticipations = previousParticipations.concat(noShows);
                });
            }
        },
    ],
});
