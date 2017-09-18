'use strict';
angular.module('app.calendar')
    .component('calendar', {
        templateUrl: '/assets/app/calendar/calendar.template.html',
        bindings: {
            'isExternal': '<'
        }, controller: ['$http', '$scope', '$location', '$translate', '$routeParams', 'dateService',
            'StudentExamRes', 'Calendar', 'SettingsResource', 'InteroperabilityResource',
            'uiCalendarConfig',
            function ($http, $scope, $location, $translate, $routeParams, dateService, StudentExamRes,
                      Calendar, SettingsResource, InteroperabilityResource, uiCalendarConfig) {

                var vm = this;

                vm.$onInit = function () {
                    vm.limitations = {};
                    vm.openingHours = [];
                    vm.exceptionHours = [];
                    vm.loader = {
                        loading: false
                    };
                    SettingsResource.iop.get(function (data) {
                        vm.isInteroperable = data.isInteroperable;
                        if (vm.isInteroperable && vm.isExternal) {
                            InteroperabilityResource.organisations.query(function (data) {
                                vm.organisations = data.filter(function (org) {
                                    return !org.homeOrg;
                                });
                            });
                        }
                    });

                    StudentExamRes.examInfo.get({eid: $routeParams.id}, function (info) {
                        vm.examInfo = info;
                        uiCalendarConfig.calendars.myCalendar.fullCalendar('gotoDate', moment.max(moment(),
                            moment(vm.examInfo.examActiveStartDate))); // Not sure if this works now?
                        Calendar.reservationWindowApi.get(function (setting) {
                            vm.reservationWindowEndDate = moment().add(setting.value, 'days');
                            vm.minDate = moment.max(moment(), moment(vm.examInfo.examActiveStartDate));
                            vm.maxDate = moment.min(vm.reservationWindowEndDate, moment(vm.examInfo.examActiveEndDate));

                            vm.showReservationWindowInfo = function () {
                                return moment(vm.examInfo.examActiveEndDate) > vm.reservationWindowEndDate;
                            };
                            vm.getReservationWindowDescription = function () {
                                return $translate.instant('sitnet_description_reservation_window')
                                        .replace('{}', setting.value) + ' (' +
                                    vm.reservationWindowEndDate.format('DD.MM.YYYY') + ')';
                            };
                            $http.get('/app/accessibility').success(function (data) {
                                vm.accessibilities = data;
                                vm.selectedAccessibilities = function () {
                                    return vm.accessibilities.filter(function (a) {
                                        return a.filtered;
                                    });
                                };
                            });
                            $http.get('/app/rooms').then(function (reply) {
                                vm.rooms = reply.data;

                                vm.selectedRoom = function () {
                                    var room = null;
                                    vm.rooms.some(function (r) {
                                        if (r.filtered) {
                                            room = r;
                                            return true;
                                        }
                                    });
                                    return room;
                                };

                                vm.getRoomInstructions = function () {
                                    if (!vm.selectedRoom()) {
                                        return;
                                    }
                                    var info;
                                    switch ($translate.use()) {
                                        case 'fi':
                                            info = vm.selectedRoom().roomInstruction;
                                            break;
                                        case 'sv':
                                            info = vm.selectedRoom().roomInstructionSV;
                                            break;
                                        case 'en':
                                        /* falls through */
                                        default:
                                            info = vm.selectedRoom().roomInstructionEN;
                                            break;
                                    }
                                    return info;
                                };

                                vm.getRoomAccessibility = function () {
                                    if (!vm.selectedRoom()) {
                                        return;
                                    }
                                    return vm.selectedRoom().accessibility.map(function (a) {
                                        return a.name;
                                    }).join(', ');
                                };

                            });
                        });
                    });
                };

                vm.makeExternalReservation = function () {
                    $location.path('/iop/calendar/' + $routeParams.id);
                };

                vm.makeInternalReservation = function () {
                    $location.path('/calendar/' + $routeParams.id);
                };

                var adjust = function (date, tz) {
                    date = moment.tz(date, tz);
                    var offset = date.isDST() ? -1 : 0;
                    return date.add(offset, 'hour').format();
                };

                var getTitle = function (slot) {
                    if (slot.availableMachines > 0) {
                        return $translate.instant('sitnet_slot_available') + ' (' + slot.availableMachines + ')';
                    }
                    if (slot.availableMachines < 0) {
                        return slot.conflictingExam || $translate.instant('sitnet_own_reservation');
                    }
                    return $translate.instant('sitnet_reserved');
                };

                var getColor = function (slot) {
                    if (slot.availableMachines < 0) {
                        return '#266B99';
                    }
                    if (slot.availableMachines > 0) {
                        return '#A6E9B2';
                    }
                    return '#D8D8D8';
                };

                var query = function (success, error, date, room, accessibility) {
                    if (vm.isExternal) {
                        InteroperabilityResource.slots.query({
                            examId: $routeParams.id,
                            roomRef: room._id,
                            org: vm.selectedOrganisation._id,
                            date: date
                        }, success, error);
                    } else {
                        Calendar.slotsApi.query({
                            eid: $routeParams.id,
                            rid: room.id,
                            day: date,
                            aids: accessibility
                        }, success, error);
                    }
                };

                vm.refresh = function (start, callback) {
                    var date = start.format();
                    var room = vm.selectedRoom();
                    var accessibility = vm.accessibilities.filter(function (item) {
                        return item.filtered;
                    }).map(function (item) {
                        return item.id;
                    });
                    if (room) {
                        vm.loader.loading = true;
                        var successFn = function (slots) {
                            var tz = room.localTimezone;
                            var events = slots.map(function (slot) {
                                return {
                                    title: getTitle(slot),
                                    color: getColor(slot),
                                    start: adjust(slot.start, tz),
                                    end: adjust(slot.end, tz),
                                    availableMachines: slot.availableMachines
                                };
                            });
                            callback(events);
                            vm.loader.loading = false;
                        };
                        var errorFn = function (error) {
                            vm.loader.loading = false;
                            if (error && error.status === 404) {
                                toastr.error($translate.instant('sitnet_exam_not_active_now'));
                            } else if (error) {
                                toastr.error(error.data.message);
                            } else {
                                toastr.error($translate.instant('sitnet_no_suitable_enrolment_found'));
                            }
                        };
                        query(successFn, errorFn, date, room, accessibility);
                        vm.exceptionHours = Calendar.getExceptionHours();
                    }
                };

                $scope.$on('$localeChangeSuccess', function () {
                    vm.calendarConfig.buttonText.today = $translate.instant('sitnet_today');
                    vm.openingHours = Calendar.processOpeningHours(vm.selectedRoom());
                });

                var listExternalRooms = function () {
                    if (vm.selectedOrganisation) {
                        InteroperabilityResource.facilities.query({org: vm.selectedOrganisation._id}, function (data) {
                            vm.rooms = data;
                        });
                    }
                };


                vm.createReservation = function (start, end) {
                    vm.reservation = {
                        room: vm.selectedRoom().name,
                        time: start.format('DD.MM.YYYY HH:mm') + ' - ' + end.format('HH:mm'),
                        start: start,
                        end: end
                    };
                };

                vm.confirmReservation = function () {
                    Calendar.reserve(
                        vm.reservation.start,
                        vm.reservation.end,
                        vm.selectedRoom(),
                        vm.accessibilities,
                        vm.selectedOrganisation);
                };

                vm.setOrganisation = function (org) {
                    vm.selectedOrganisation = org;
                    org.filtered = !org.filtered;
                    vm.rooms.forEach(function (r) {
                        delete r.filtered;
                    });
                    //uiCalendarConfig.calendars.externalCalendar.fullCalendar('refetchEvents');
                    listExternalRooms();
                };

                vm.selectAccessibility = function (accessibility) {
                    accessibility.filtered = !accessibility.filtered;
                    if (vm.selectedRoom()) {
                        uiCalendarConfig.calendars.myCalendar.fullCalendar('refetchEvents');
                    }
                };

                vm.getDescription = function (room) {
                    if (room.outOfService) {
                        var status = room.statusComment ? ': ' + room.statusComment : '';
                        return $translate.instant('sitnet_room_out_of_service') + status;
                    }
                    return room.name;
                };

                vm.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                vm.selectRoom = function (room) {
                    if (!room.outOfService) {
                        vm.rooms.forEach(function (room) {
                            delete room.filtered;
                        });
                        room.filtered = true;
                        vm.openingHours = Calendar.processOpeningHours(room);
                    }
                };

            }]
    });

