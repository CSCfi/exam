'use strict';
angular.module('app.enrolment')
    .component('enrolmentCandidate', {
        templateUrl: '/assets/app/enrolment/exams/examEnrolmentCandidate.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$location', 'Enrolment',
            function ($location, Enrolment) {

                var vm = this;

                vm.enrollForExam = function () {
                    Enrolment.checkAndEnroll(vm.exam);
                };

                vm.makeReservation = function () {
                    $location.path('/calendar/' + vm.exam.id);
                };

            }
        ]
    });
