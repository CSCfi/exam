'use strict';
angular.module('app.exam.editor')
    .component('examPreParticipantSelector', {
        templateUrl: '/assets/app/exam/editor/publication/examPreParticipantSelector.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$translate', 'Enrolment', 'EnrollRes',
            function ($translate, Enrolment, EnrollRes) {

                var vm = this;

                vm.$onInit = function () {
                    vm.newPreParticipant = {
                        'email': null
                    };
                };

                vm.addPreParticipant = function () {
                    var exists = vm.exam.examEnrolments.map(function (e) {
                        return e.preEnrolledUserEmail;
                    }).indexOf(vm.newPreParticipant.email) > -1;
                    if (!exists) {
                        Enrolment.enrollStudent(vm.exam, vm.newPreParticipant).then(
                            function (enrolment) {
                                vm.exam.examEnrolments.push(enrolment);
                                delete vm.newPreParticipant.email;
                            }, function (error) {
                                toastr.error(error.data);

                            });
                    }
                };

                vm.removeParticipant = function (id) {
                    EnrollRes.unenrollStudent.remove({id: id}, function () {
                        vm.exam.examEnrolments = vm.exam.examEnrolments.filter(function (ee) {
                            return ee.id !== id;
                        });
                        toastr.info($translate.instant('sitnet_participant_removed'));
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                vm.isPreEnrolment = function (enrolment) {
                    return enrolment.preEnrolledUserEmail;
                };

            }]
    });
