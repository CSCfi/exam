'use strict';
angular.module('app.facility.rooms')
    .component('roomList', {
        templateUrl: '/assets/app/facility/rooms/roomList.template.html',
        controller: ['$routeParams', 'Session', '$location', 'Room', '$translate', 'toast',
            function ($routeParams, Session, $location, Room,  $translate, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.user = Session.getUser();

                    if (vm.user.isAdmin) {
                        if (!$routeParams.id) {
                            Room.rooms.query(function (rooms) {
                                vm.times = Room.getTimes();
                                vm.rooms = rooms;
                                angular.forEach(vm.rooms, function (room) {
                                    room.examMachines = room.examMachines.filter(function (machine) {
                                        return !machine.archived;
                                    });
                                });
                            });
                        }
                    }
                    else {
                        $location.path("/");
                    }
                };

                vm.disableRoom = function (room) {
                    Room.disableRoom(room);
                };

                vm.enableRoom = function (room) {
                    Room.enableRoom(room);
                };

                // Called when create exam button is clicked
                vm.createExamRoom = function () {
                    Room.draft.get(
                        function (room) {
                            toast.info($translate.instant("sitnet_room_draft_created"));
                            $location.path("/rooms/" + room.id);
                        }, function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.editMultipleRooms = function () {
                    $location.path("/rooms_edit/edit_multiple");
                };

                vm.isArchived = function (machine) {
                    return machine.isArchived() === false;
                };

                vm.displayAddress = function (address) {

                    if (!address || (!address.street && !address.city && !address.zip)) return "N/A";
                    var street = address.street ? address.street + ", " : "";
                    var city = (address.city || "").toUpperCase();
                    return street + address.zip + " " + city;
                };

            }]
    });
