'use strict';
angular.module('app.enrolment')
    .component('examParticipations', {
        templateUrl: '/assets/app/enrolment/finished/examParticipations.template.html',
        controller: ['$scope', '$translate', 'StudentExamRes', 'toast',
            function ($scope, $translate, StudentExamRes, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.filter = {ordering: '-ended', text: null};
                    vm.pageSize = 10;
                    vm.search();
                };

                vm.search = function () {
                    StudentExamRes.finishedExams.query({filter: vm.filter.text},
                        function (data) {
                            data.filter(function (t) {
                                return !t.ended;
                            }).forEach(function (t) {
                                // no-shows, end time to reflect reservations end time
                                t.ended = t.reservation.endAt;
                            });
                            vm.participations = data;
                        },
                        function (error) {
                            toast.error(error.data);
                        });
                };

            }
        ]
    });




