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

'use strict';
angular.module('app.facility.rooms')
    .component('multiRoom', {
        templateUrl: '/assets/app/facility/rooms/multiRoom.template.html',
        controller: ['Room', 'toast', function (Room, toast) {
            var vm = this;

            vm.$onInit = function () {
                vm.week = Room.getWeek();
                loadRooms();
            };

            vm.addException = function (exception) {
                Room.addException(getRoomIds(), exception.exception).then(function () {
                    loadRooms();
                });
            };

            vm.deleteException = function (exception) {
                Room.deleteException(vm.rooms[0].id, exception.id).then(function () {
                    loadRooms();
                });
            };

            vm.addMultiRoomException = function () {
                Room.openExceptionDialog(vm.addException);
            };

            vm.updateWorkingHours = function () {
                Room.updateWorkingHours(vm.week, getRoomIds());
            };

            vm.massEditedRoomFilter = function (room) {
                return room.calendarExceptionEvents.some(function (e) {
                    return e.massEdited;
                });
            };

            vm.massEditedExceptionFilter = function (exception) {
                return exception.massEdited;
            };

            function loadRooms() {
                Room.rooms.query(
                    function (rooms) {
                        vm.rooms = rooms;
                        vm.roomIds = getRoomIds();
                    }, function (error) {
                        toast.error(error.data);
                    }
                );
            }

            function getRoomIds() {
                return vm.rooms.map(function (room) {
                    return room.id;
                });
            }
        }]
    });