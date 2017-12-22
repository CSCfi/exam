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