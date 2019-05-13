/*
 * Copyright (c) 2017 Exam Consortium
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

import angular from 'angular';
import toast from 'toastr';
import moment from 'moment';

angular.module('app.facility.rooms')
    .component('room', {
        template: require('./room.template.html'),
        controller: ['$translate', '$location', '$routeParams', 'Room', 'SettingsResource', 'InteroperabilityResource',
            function ($translate, $location, $routeParams, Room, SettingsRes, InteroperabilityRes) {

                const vm = this;

                vm.$onInit = function () {
                    vm.week = Room.getWeek();
                    vm.showName = true;
                    SettingsRes.examVisit.get(function (data) {
                        vm.isInteroperable = data.isExamVisitSupported;
                    });

                    Room.rooms.get({ id: $routeParams.id },
                        function (room) {
                            room.availableForExternals = room.externalRef !== null;
                            vm.room = room;
                            if (!Room.isAnyExamMachines(vm.room)) {
                                toast.warning($translate.instant('sitnet_room_has_no_machines_yet'));
                            }
                            vm.room.calendarExceptionEvents.forEach(function (event) {
                                Room.formatExceptionEvent(event);
                            });
                            vm.room.defaultWorkingHours.forEach(function (daySlot) {
                                const timeSlots = slotToTimes(daySlot);
                                setSelected(daySlot.weekday, timeSlots);
                            });
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.updateWorkingHours = function () {
                    Room.updateWorkingHours(vm.week, [vm.room.id]);
                };

                vm.addException = function (exception) {
                    Room.addException([vm.room.id], exception).then(function (data) {
                        Room.formatExceptionEvent(data);
                        vm.room.calendarExceptionEvents.push(data);
                    });
                };

                vm.deleteException = function (exception) {
                    Room.deleteException(vm.room.id, exception.id).then(function () {
                        remove(vm.room.calendarExceptionEvents, exception);
                    });
                };

                vm.disableRoom = function () {
                    Room.disableRoom(vm.room);
                };

                vm.enableRoom = function () {
                    Room.enableRoom(vm.room);
                };

                vm.updateRoom = function () {
                    Room.rooms.update(vm.room,
                        function () {
                            toast.info($translate.instant('sitnet_room_updated'));
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.saveRoom = function () {
                    if (!Room.isSomethingSelected(vm.week)) {
                        toast.error($translate.instant('sitnet_room_must_have_default_opening_hours'));
                        return;
                    }

                    if (!Room.isAnyExamMachines(vm.room))
                        toast.error($translate.instant('sitnet_dont_forget_to_add_machines') + ' ' + vm.room.name);

                    Room.rooms.update(vm.room,
                        function () {
                            toast.info($translate.instant('sitnet_room_saved'));
                            $location.path('/rooms/');
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.updateInteroperability = function () {
                    InteroperabilityRes.facility.update(vm.room, function (data) {
                        vm.room.externalRef = data.externalRef;
                        vm.room.availableForExternals = data.externalRef !== null;
                    }, function (err) {
                        vm.room.availableForExternals = !vm.room.availableForExternals;
                        toast.error(err.data.message);
                    });
                };

                function remove(arr, item) {
                    const index = arr.indexOf(item);
                    arr.splice(index, 1);
                }

                function setSelected(day, slots) {
                    for (let i = 0; i < slots.length; ++i) {
                        if (vm.week[day][slots[i]]) {
                            vm.week[day][slots[i]].type = 'selected';
                        }
                    }
                }

                function slotToTimes(slot) {
                    const arr = [];
                    const startKey = moment(slot.startTime).format('H:mm');
                    const endKey = moment(slot.endTime).format('H:mm');
                    const times = Room.getTimes();
                    const start = startKey === '0:00' ? 0 : times.indexOf(startKey);
                    for (let i = start; i < times.length; i++) {
                        if (times[i] === endKey) {
                            break;
                        }
                        arr.push(i);
                    }
                    return arr;
                }

            }]
    });
