'use strict';

angular.module('app.review')
    .component('rGeneralInfo', {
        templateUrl: '/assets/app/review/assessment/general/generalInfo.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['ExamRes', 'Attachment',
            function (ExamRes, Attachment) {

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
                    ExamRes.examParticipationsOfUser.query({
                            eid: vm.exam.parent.id,
                            uid: vm.student.id
                        }, function (data) {
                            // Filter out the participation we are looking into
                            vm.previousParticipations = data.filter(function (p) {
                                return p.id !== vm.participation.id;
                            });
                        });
                };

                vm.downloadExamAttachment = function () {
                    Attachment.downloadExamAttachment(vm.exam)
                }

            }
        ]
    });
