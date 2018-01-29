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
require('moment-timezone');

angular.module('app.calendar')
    .service('Calendar', ['$resource', '$uibModal', '$http', '$routeParams', '$translate', '$location',
        'DateTime', 'Session', 'InteroperabilityResource', '$q',
        function ($resource, $modal, $http, $routeParams, $translate, $location, DateTime, Session,
                  InteroperabilityResource, $q) {

            const self = this;

            self.slotsApi = $resource('/app/calendar/:eid/:rid', {eid: '@eid', rid: '@rid'});
            self.reservationWindowApi = $resource('/app/settings/reservationWindow');

            const adjustBack = function (date, tz) {
                date = moment.tz(date, tz);
                const offset = date.isDST() ? 1 : 0;
                return moment.utc(date.add(offset, 'hour')).format();
            };

            self.reserve = function (start, end, room, accessibilities, org) {
                const deferred = $q.defer();
                const tz = room.localTimezone;
                const slot = {
                    start: adjustBack(start, tz),
                    end: adjustBack(end, tz),
                    examId: parseInt($routeParams.id)
                };
                if (org) { // External reservation request
                    slot.roomId = room._id;
                    slot.orgId = org ? org._id : undefined;
                    InteroperabilityResource.reservations.create(slot, function () {
                        $location.path('/');
                        deferred.resolve();
                    }, function (error) {
                        toast.error(error.data);
                        deferred.reject(error);
                    });
                } else {
                    slot.roomId = room.id;
                    slot.aids = accessibilities.filter(
                        function (item) {
                            return item.filtered;
                        })
                        .map(function (item) {
                            return item.id;
                        });
                    $http.post('/app/calendar/reservation', slot).then(function () {
                        $location.path('/');
                        deferred.resolve();
                    }, function (error) {
                        toast.error(error.data);
                        deferred.reject(error);
                    });
                }
                return deferred.promise;
            };


            self.renderCalendarTitle = function () {
                // Fix date range format in title
                const selector = $('.fc-toolbar .fc-center > h2');
                const title = selector.text();
                const separator = ' — ';
                const endPart = title.split(separator)[1];
                const startFragments = title.split(separator)[0].split('.').filter(function (x) {
                    // ignore empty fragments (introduced if title already correctly formatted)
                    return x;
                });
                let newTitle = '';
                if (startFragments.length < 3) {
                    startFragments.forEach(function (f) {
                        newTitle += f;
                        if (f && f[f.length - 1] !== '.') {
                            newTitle += '.';
                        }
                    });
                    newTitle += separator + endPart;
                    selector.text(newTitle);
                }
            };

            const getWeekdayNames = function () {
                const lang = Session.getUser().lang;
                const locale = lang.toLowerCase() + '-' + lang.toUpperCase();
                const options = {weekday: 'short'};
                const weekday = DateTime.getDateForWeekday;
                return {
                    SUNDAY: {ord: 7, name: weekday(0).toLocaleDateString(locale, options)},
                    MONDAY: {ord: 1, name: weekday(1).toLocaleDateString(locale, options)},
                    TUESDAY: {ord: 2, name: weekday(2).toLocaleDateString(locale, options)},
                    WEDNESDAY: {ord: 3, name: weekday(3).toLocaleDateString(locale, options)},
                    THURSDAY: {ord: 4, name: weekday(4).toLocaleDateString(locale, options)},
                    FRIDAY: {ord: 5, name: weekday(5).toLocaleDateString(locale, options)},
                    SATURDAY: {ord: 6, name: weekday(6).toLocaleDateString(locale, options)}
                };
            };

            const findOpeningHours = function (obj, items) {
                let found = null;
                items.some(function (item) {
                    if (item.ref === obj.weekday) {
                        found = item;
                        return true;
                    }
                });
                return found;
            };

            self.processOpeningHours = function (room) {
                if (!room) {
                    return;
                }
                const weekdayNames = getWeekdayNames();
                const openingHours = [];
                const tz = room.localTimezone;

                room.defaultWorkingHours.forEach(function (dwh) {
                    if (!findOpeningHours(dwh, openingHours)) {
                        const obj = {
                            name: weekdayNames[dwh.weekday].name,
                            ref: dwh.weekday,
                            ord: weekdayNames[dwh.weekday].ord,
                            periods: []
                        };
                        openingHours.push(obj);
                    }
                    const hours = findOpeningHours(dwh, openingHours);
                    hours.periods.push(
                        moment.tz(dwh.startTime, tz).format('HH:mm') + ' - ' +
                        moment.tz(dwh.endTime, tz).format('HH:mm'));
                });
                openingHours.forEach(function (oh) {
                    oh.periods = oh.periods.sort().join(', ');
                });
                return openingHours.sort(function (a, b) {
                    return a.ord > b.ord;
                });
            };

            const formatExceptionEvent = function (event, tz) {
                const startDate = moment.tz(event.startDate, tz);
                const endDate = moment.tz(event.endDate, tz);
                const offset = moment.tz(tz).isDST() ? -1 : 0;
                startDate.add(offset, 'hour');
                endDate.add(offset, 'hour');
                event.start = startDate.format('DD.MM.YYYY HH:mm');
                event.end = endDate.format('DD.MM.YYYY HH:mm');
                event.description = event.outOfService ? 'sitnet_closed' : 'sitnet_open';
            };

            self.getExceptionHours = function (room) {
                if (!room) {
                    return;
                }
                const start = moment.max(moment(),
                    uiCalendarConfig.calendars.myCalendar.fullCalendar('getView').start);
                const end = uiCalendarConfig.calendars.myCalendar.fullCalendar('getView').end;
                const events = room.calendarExceptionEvents.filter(function (e) {
                    return (moment(e.startDate) > start && moment(e.endDate) < end);
                });
                events.forEach(formatExceptionEvent.call(this, room.localTimezone));
                return events;
            };

            self.getEarliestOpening = function (room) {
                const tz = room.localTimezone;
                const openings = room.defaultWorkingHours.map(function (dwh) {
                    const start = moment.tz(dwh.startTime, tz);
                    return moment().hours(start.hours()).minutes(start.minutes()).seconds(start.seconds());
                });
                return moment.min(openings);
            };

            self.getLatestClosing = function (room) {
                const tz = room.localTimezone;
                const closings = room.defaultWorkingHours.map(function (dwh) {
                    const end = moment.tz(dwh.endTime, tz);
                    return moment().hours(end.hours()).minutes(end.minutes()).seconds(end.seconds());
                });
                return moment.max(closings);
            };

            self.getClosedWeekdays = function (room) {
                const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                const openedDays = room.defaultWorkingHours.map(function (dwh) {
                    return weekdays.indexOf(dwh.weekday);
                });
                return [0, 1, 2, 3, 4, 5, 6].filter(function (x) {
                    return openedDays.indexOf(x) === -1;
                });
            };

        }]);

