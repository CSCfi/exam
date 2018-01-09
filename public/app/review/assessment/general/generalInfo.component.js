/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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
    .component('rGeneralInfo', {
        templateUrl: '/assets/app/review/assessment/general/generalInfo.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['ExamRes', 'Attachment', 'Assessment',
            function (ExamRes, Attachment, Assessment) {

                var vm = this;

                vm.$onInit = function () {
                    vm.participation = vm.exam.examParticipations[0];
                    var duration = moment.utc(new Date(vm.participation.duration));
                    if (duration.second() > 29) {
                        duration.add(1, 'minutes');
                    }
                    vm.participation.duration = duration.format('HH:mm');

                    vm.student = vm.participation.user;
                    vm.enrolment = vm.exam.examEnrolments[0];
                    vm.reservation = vm.enrolment.reservation;
                    Assessment.participationsApi.query({
                        eid: vm.exam.parent.id,
                        uid: vm.student.id
                    }, function (data) {
                        // Filter out the participation we are looking into
                        var previousParticipations = data.filter(function (p) {
                            return p.id !== vm.participation.id;
                        });
                        Assessment.noShowApi.query({eid: vm.exam.parent.id, uid: vm.student.id}, function (data) {
                            var noShows = data.map(function (d) {
                                return {noShow: true, started: d.reservation.startAt, exam: {state: 'no_show'}};
                            });
                            vm.previousParticipations = previousParticipations.concat(noShows);

                        });
                    });

                };

                vm.downloadExamAttachment = function () {
                    Attachment.downloadExamAttachment(vm.exam);
                };

            }
        ]
    });
