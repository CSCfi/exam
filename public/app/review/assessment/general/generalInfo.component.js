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
