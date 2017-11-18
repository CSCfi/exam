'use strict';
angular.module('app.enrolment')
    .component('wrongLocation', {
        templateUrl: '/assets/app/enrolment/wrong-location/wrongLocation.template.html',
        bindings: {
            cause: '@'
        },
        controller: ['$http', '$routeParams', '$translate', 'Enrolment', 'StudentExamRes', 'DateTime', 'toast',
            function ($http, $routeParams, $translate, Enrolment, StudentExamRes, DateTime, toast) {

                var vm = this;

                vm.$onInit = function () {
                    if ($routeParams.eid) {
                        vm.upcoming = true;
                        StudentExamRes.enrolment.get({eid: $routeParams.eid},
                            function (enrolment) {
                                setOccasion(enrolment.reservation);
                                vm.enrolment = enrolment;
                                var room = vm.enrolment.reservation.machine.room;
                                var code = $translate.use().toUpperCase();
                                vm.roomInstructions = code === 'FI' ? room.roomInstruction : room['roomInstruction' + code];
                                $http.get('/app/machines/' + $routeParams.mid).success(function (machine) {
                                    vm.currentMachine = machine;
                                });
                                vm.printExamDuration = function () {
                                    return DateTime.printExamDuration(vm.enrolment.exam);
                                };
                            },
                            function (error) {
                                toast.error(error.data);
                            }
                        );
                    }
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

                vm.showInstructions = function() {
                    Enrolment.showInstructions(vm.enrolment);
                };



            }]
    });
