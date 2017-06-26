'use strict';
angular.module('app.exam.editor')
    .component('examParticipantSelector', {
        templateUrl: '/assets/app/exam/editor/publication/examParticipantSelector.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$translate', 'limitToFilter', 'UserRes', 'enrolmentService', 'EnrollRes',
            function ($translate, limitToFilter, UserRes, enrolmentService, EnrollRes) {

                var vm = this;

                vm.$onInit = function () {
                    vm.newParticipant = {
                        "id": null,
                        "name": null
                    };
                };

                vm.allStudents = function (filter, criteria) {

                    return UserRes.unenrolledStudents.query({eid: vm.exam.id, q: criteria}).$promise.then(
                        function (names) {
                            return limitToFilter(names, 15);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                vm.setExamParticipant = function (item, $model, $label) {
                    vm.newParticipant.id = item.id;
                };

                vm.addParticipant = function () {
                    enrolmentService.enrollStudent(vm.exam, vm.newParticipant).then(
                        function (enrolment) {

                            // push to the list
                            vm.exam.examEnrolments.push(enrolment);

                            // nullify input field
                            delete vm.newParticipant.name ;
                            delete vm.newParticipant.id;

                        }, function (error) {
                            toastr.error(error.data);

                        });

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

            }]
    });
