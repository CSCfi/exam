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

angular.module('app.facility.schedule').component('openHours', {
    template: require('./openHours.template.html'),
    bindings: {
        week: '<',
        onSelect: '&',
    },
    controller: [
        'Room',
        'DateTime',
        '$scope',
        function(Room, DateTime, $scope) {
            const vm = this;

            vm.$onInit = function() {
                vm.weekdayNames = DateTime.getWeekdayNames();
                vm.times = Room.getTimes();
            };

            vm.timeRange = function() {
                return Array.apply(null, new Array(vm.times.length - 1)).map(function(x, i) {
                    return i;
                });
            };

            vm.getWeekdays = function() {
                return Object.keys(vm.week);
            };

            vm.getType = function(day, time) {
                return vm.week[day][time].type;
            };

            vm.calculateTime = function(index) {
                return (vm.times[index] || '0:00') + ' - ' + vm.times[index + 1];
            };

            vm.selectSlot = function(day, time) {
                const status = vm.week[day][time].type;
                if (status === 'accepted') {
                    // clear selection
                    vm.week[day][time].type = '';
                    return;
                }
                if (status === 'selected') {
                    // mark everything hereafter as free until next block
                    for (let i = 0; i < vm.week[day].length; ++i) {
                        if (i >= time) {
                            if (vm.week[day][i].type === 'selected') {
                                vm.week[day][i].type = '';
                            } else {
                                break;
                            }
                        }
                    }
                } else {
                    // check if something is accepted yet
                    let accepted;
                    for (let i = 0; i < vm.week[day].length; ++i) {
                        if (vm.week[day][i].type === 'accepted') {
                            accepted = i;
                            break;
                        }
                    }
                    if (accepted >= 0) {
                        // mark everything between accepted and this as selected
                        if (accepted < time) {
                            for (let i = accepted; i <= time; ++i) {
                                vm.week[day][i].type = 'selected';
                            }
                        } else {
                            for (let i = time; i <= accepted; ++i) {
                                vm.week[day][i].type = 'selected';
                            }
                        }
                    } else {
                        vm.week[day][time].type = 'accepted'; // mark beginning
                    }
                }

                vm.onSelect();
            };

            $scope.$on('$localeChangeSuccess', function() {
                vm.weekdayNames = DateTime.getWeekdayNames();
            });
        },
    ],
});
