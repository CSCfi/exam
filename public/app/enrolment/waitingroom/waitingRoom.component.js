'use strict';
angular.module('app.enrolment')
    .component('waitingRoom', {
        templateUrl: '/assets/app/enrolment/waitingroom/waitingRoom.template.html',
        controller: ['$http', '$routeParams', '$timeout', '$translate', '$location', 'StudentExamRes',
            function ($http, $routeParams, $timeout, $translate, $location, StudentExamRes) {

                var vm = this;

                vm.$onInit = function () {
                    if ($routeParams.id) {
                        vm.upcoming = true;
                        StudentExamRes.enrolment.get({eid: $routeParams.id},
                            function (enrolment) {
                                setOccasion(enrolment.reservation);
                                vm.enrolment = enrolment;
                                var offset = calculateOffset();
                                vm.timeout = $timeout(function () {
                                    $location.path('/student/exam/' + vm.enrolment.exam.hash);
                                }, offset);

                                var room = vm.enrolment.reservation.machine.room;
                                var code = $translate.use().toUpperCase();
                                vm.roomInstructions = code === 'FI' ? room.roomInstruction : room['roomInstruction' + code];
                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                    }
                };

                vm.$onDestroy = function () {
                    if (vm.timeout) {
                        $timeout.cancel(vm.timeout);
                    }
                };

                var calculateOffset = function () {
                    var startsAt = moment(vm.enrolment.reservation.startAt);
                    var now = moment();
                    if (now.isDST()) {
                        startsAt.add(-1, 'hour');
                    }
                    return Date.parse(startsAt.format()) - new Date().getTime();
                };

                var setOccasion = function (reservation) {
                    var tz = reservation.machine.room.localTimezone;
                    var start = moment.tz(reservation.startAt, tz);
                    var end = moment.tz(reservation.endAt, tz);
                    if (start.isDST()) {
                        start.add(-1, 'hour');
                    }
                    if (end.isDST()) {
                        end.add(-1, 'hour');
                    }
                    reservation.occasion = {
                        startAt: start.format('HH:mm'),
                        endAt: end.format('HH:mm')
                    };
                };

            }]
    });
