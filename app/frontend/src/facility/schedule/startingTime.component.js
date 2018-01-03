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
angular.module('app.facility.schedule')
    .component('startingTime', {
        templateUrl: '/assets/app/facility/schedule/startingTime.template.html',
        bindings: {
            roomIds: '<',
            startingHours: '<'
        },
        controller: ['Room', function (Room) {
            var vm = this;

            vm.$onInit = function () {
                vm.examStartingHours = Array.apply(null, new Array(24)).map(function (x, i) {
                    return {startingHour: i + ":00", selected: true};
                });
                if (vm.startingHours && vm.startingHours.length > 0) {
                    var startingHours = vm.startingHours.map(function (hour) {
                        return moment(hour.startingHour);
                    });
                    vm.examStartingHourOffset = startingHours[0].minute();
                    startingHours = startingHours.map(function (hour) {
                        return hour.format("H:mm");
                    });
                    vm.setStartingHourOffset();
                    vm.examStartingHours.forEach(function (hour) {
                        hour.selected = startingHours.indexOf(hour.startingHour) !== -1;
                    });
                }
            };

            vm.updateStartingHours = function () {
                Room.updateStartingHours(vm.examStartingHours, vm.examStartingHourOffset, vm.roomIds)
                    .then(function () {
                        if (vm.startingHours) {
                            vm.startingHours = vm.examStartingHours;
                        }
                    });
            };

            vm.toggleAllExamStartingHours = function () {
                var anySelected = vm.examStartingHours.some(function (hours) {
                    return hours.selected;
                });
                vm.examStartingHours.forEach(function (hours) {
                    hours.selected = !anySelected;
                });
            };

            vm.setStartingHourOffset = function () {
                vm.examStartingHourOffset = vm.examStartingHourOffset || 0;
                vm.examStartingHours.forEach(function (hours) {
                    hours.startingHour = hours.startingHour.split(':')[0] + ':' + zeropad(vm.examStartingHourOffset);
                });
            };

            vm.anyStartingHoursSelected = function () {
                return vm.examStartingHours.some(function (hours) {
                    return hours.selected;
                });
            };

            function zeropad(n) {
                n += '';
                return n.length > 1 ? n : '0' + n;
            }
        }]
    });
