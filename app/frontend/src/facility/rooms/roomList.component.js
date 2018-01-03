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

import angular from'angular';

angular.module('app.facility.rooms')
    .component('roomList', {
        template: require('./roomList.template.html'),
        controller: ['$routeParams', 'Session', '$location', 'Room', '$translate', 'toast',
            function ($routeParams, Session, $location, Room,  $translate, toast) {

                const vm = this;

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
                    const street = address.street ? address.street + ", " : "";
                    const city = (address.city || "").toUpperCase();
                    return street + address.zip + " " + city;
                };

            }]
    });
