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
import { fail } from 'assert';

angular.module('app.facility.rooms').component('availability', {
    template: require('./availability.template.html'),
    controller: [
        '$routeParams',
        'Room',
        'Calendar',
        function($routeParams, Room, Calendar) {
            const vm = this;

            vm.$onInit = function() {
                vm.loader = {
                    loading: false,
                };
                Room.rooms.get({ id: $routeParams.id }, function(room) {
                    vm.openingHours = Calendar.processOpeningHours(room);
                    vm.exceptionHours = Calendar.getExceptionalAvailability(room);
                    vm.room = room;
                    $('#calendarBlock').css({ display: 'block' });
                    $('#calendar')
                        .css({ position: 'relative', visibility: 'visible', display: 'block' })
                        .fullCalendar('render');
                });
            };

            const query = function(successFn, date) {
                Room.getAvailability($routeParams.id, date)
                    .then(successFn)
                    .catch(resp => {
                        toast.error(resp);
                    });
            };

            const adjust = function(date, tz) {
                const adjusted = moment.tz(date, tz);
                const offset = adjusted.isDST() ? -1 : 0;
                return adjusted.add(offset, 'hour').format();
            };

            const getColor = function(slot) {
                const ratio = slot.reserved / slot.total;
                if (ratio <= 0.5) return '#A6E9B2';
                if (ratio <= 0.9) return '#FCF8E3';
                return '#266B99';
            };

            vm.refresh = function(start, callback) {
                if (!vm.room) {
                    return;
                }
                const date = start.format();
                vm.loader.loading = true;
                const tz = vm.room.localTimezone;
                const successFn = resp => {
                    const events = resp.map(slot => {
                        return {
                            title: slot.reserved + ' / ' + slot.total,
                            color: getColor(slot),
                            start: adjust(slot.start, tz),
                            end: adjust(slot.end, tz),
                            availableMachines: 0,
                        };
                    });
                    callback(events);
                    vm.loader.loading = false;
                };
                query(successFn, date);
            };
        },
    ],
});
