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

import * as angular from 'angular';
import * as moment from 'moment';
import { AssessmentService } from '../assessment.service';

angular.module('app.review')
    .component('rGeneralInfo', {
        template: require('./generalInfo.template.html'),
        bindings: {
            exam: '<',
            participation: '<',
            collaborative: '<'
        },
        controller: ['Attachment', 'Assessment', '$routeParams', '$resource',
            function (Attachment, Assessment: AssessmentService, $routeParams, $resource) {

                const vm = this;

                const noShowApi = $resource('/app/usernoshows/:eid', {
                    eid: '@eid'
                });

                const participationsApi = $resource('/app/examparticipations/:eid', {
                    eid: '@eid'
                });

                const collaborativeParticipationsApi = $resource('/integration/iop/reviews/:eid/participations/:aid', {
                    eid: '@eid',
                    aid: '@aid'
                });

                vm.$onInit = function () {
                    const duration = moment.utc(new Date(vm.participation.duration));
                    if (duration.second() > 29) {
                        duration.add(1, 'minutes');
                    }
                    vm.participation.duration = duration.format('HH:mm');

                    vm.student = vm.participation.user;
                    vm.studentName = vm.student ? `${vm.student.lastName} ${vm.student.firstName}` :
                        vm.collaborative ? vm.participation._id : vm.exam.id;
                    vm.enrolment = vm.exam.examEnrolments[0];
                    vm.reservation = vm.enrolment.reservation;
                    const params = {
                        eid: vm.exam.id,
                        aid: undefined
                    };
                    let api = participationsApi;
                    if (vm.collaborative) {
                        api = collaborativeParticipationsApi;
                        params.eid = $routeParams.id;
                        params.aid = $routeParams.ref;
                    }
                    api.query(params, handleParticipations);
                };

                vm.downloadExamAttachment = function () {
                    if (vm.collaborative) {
                        const attachment = vm.exam.attachment;
                        Attachment.downloadCollaborativeAttachment(attachment.externalId, attachment.fileName);
                        return;
                    }
                    Attachment.downloadExamAttachment(vm.exam);
                };

                function handleParticipations(data) {
                    if (vm.collaborative) {
                        // TODO: Add collaborative support for noshows.
                        vm.previousParticipations = data;
                        return;
                    }
                    // Filter out the participation we are looking into
                    const previousParticipations = data.filter(function (p) {
                        return p.id !== vm.participation.id;
                    });
                    noShowApi.query({ eid: vm.exam.id }, function (data) {
                        const noShows = data.map(function (d) {
                            return { noShow: true, started: d.reservation.startAt, exam: { state: 'no_show' } };
                        });
                        vm.previousParticipations = previousParticipations.concat(noShows);
                    });
                }
            }
        ]
    });
