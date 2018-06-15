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

angular.module('app.facility')
    .component('adminTabs', {
        template: require('./adminTabs.template.html'),
        controller: ['$routeParams', '$translate', 'Session', '$window', '$location', 'Room',
            function ($routeParams, $translate, Session, $window, $location, Room) {

                const vm = this;

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    vm.activeTab = 1;
                };

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

                vm.tabChanged = function (index) {
                    $location.path('/rooms', false).replace();
                };

                vm.switchToExamRooms = function () {
                    vm.activeTab = 1;
                };

                vm.switchToExceptionTimes = function () {
                    vm.activeTab = 2;
                };

                vm.switchToNeededSoftware = function () {
                    vm.activeTab = 3;
                };

                vm.switchToAccessibility = function () {
                    vm.activeTab = 4;
                };

                vm.goBack = function (event) {
                    event.preventDefault();
                    $window.history.back();
                };

            }
        ]
    });