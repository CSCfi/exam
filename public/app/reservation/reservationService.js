(function () {
    'use strict';
    angular.module('exam.services')
        .service('reservationService', ['$q', '$modal', '$http', '$routeParams', '$translate', '$location', 'dialogs',
            'dateService', 'sessionService',
            function ($q, $modal, $http, $routeParams, $translate, $location, dialogs, dateService, sessionService) {

                var self = this;

                self.removeReservation = function (enrolment) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_are_you_sure'));
                    dialog.result.then(function (btn) {
                        $http.delete('calendar/reservation/' + enrolment.reservation.id).success(function () {
                            delete enrolment.reservation;
                            enrolment.reservationCanceled = true;
                        }).error(function (msg) {
                            toastr.error(msg);
                        });
                    });
                };

                self.getReservationCount = function (exam) {
                    return exam.examEnrolments.filter(function (enrolment) {
                        return enrolment.reservation && enrolment.reservation.endAt > new Date().getTime();
                    }).length;
                };

                self.viewReservations = function (examId) {
                    $location.path('/reservations').search({eid: examId});
                };

                self.renderCalendarTitle = function () {
                    // Fix date range format in title
                    var selector = $(".fc-toolbar .fc-center > h2");
                    var title = selector.text();
                    var newTitle = '';
                    var separator = ' — ';
                    var endPart = title.split(separator)[1];
                    var startFragments = title.split(separator)[0].split('.').filter(function (x) {
                        // ignore empty fragments (introduced if title already correctly formatted)
                        return x;
                    });
                    if (startFragments.length < 3) {
                        startFragments.forEach(function (f) {
                            newTitle += f;
                            if (f && f[f.length - 1] != '.') {
                                newTitle += '.';
                            }
                        });
                        newTitle += separator + endPart;
                        selector.text(newTitle);
                    }
                };

                var getWeekdayNames = function () {
                    var lang = sessionService.getUser().lang;
                    var locale = lang.toLowerCase() + "-" + lang.toUpperCase();
                    var options = {weekday: 'short'};
                    var weekday = dateService.getDateForWeekday;
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

                var findOpeningHours = function (obj, items) {
                    var found = undefined;
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
                    var weekdayNames = getWeekdayNames();
                    var openingHours = [];
                    var tz = room.localTimezone;

                    room.defaultWorkingHours.forEach(function (dwh) {
                        if (!findOpeningHours(dwh, openingHours)) {
                            var obj = {
                                name: weekdayNames[dwh.weekday].name,
                                ref: dwh.weekday,
                                ord: weekdayNames[dwh.weekday].ord,
                                periods: []
                            };
                            openingHours.push(obj);
                        }
                        var hours = findOpeningHours(dwh, openingHours);
                        hours.periods.push(
                            moment.tz(dwh.startTime, tz).format('HH:mm') + " - " +
                            moment.tz(dwh.endTime, tz).format('HH:mm'));
                    });
                    openingHours.forEach(function (oh) {
                        oh.periods = oh.periods.sort().join(', ');
                    });
                    return openingHours.sort(function (a, b) {
                        return a.ord > b.ord;
                    });
                };

                var formatExceptionEvent = function (event, tz) {
                    var startDate = moment.tz(event.startDate, tz);
                    var endDate = moment.tz(event.endDate, tz);
                    var offset = moment.tz(tz).isDST() ? -1 : 0;
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
                    var start = moment.max(moment(),
                        uiCalendarConfig.calendars.myCalendar.fullCalendar('getView').start);
                    var end = uiCalendarConfig.calendars.myCalendar.fullCalendar('getView').end;
                    var events = room.calendarExceptionEvents.filter(function (e) {
                        return (moment(e.startDate) > start && moment(e.endDate) < end);
                    });
                    events.forEach(formatExceptionEvent.call(this, room.localTimezone));
                    return events;
                };

                self.getEarliestOpening = function (room) {
                    var tz = room.localTimezone;
                    var openings = room.defaultWorkingHours.map(function (dwh) {
                        var start = moment.tz(dwh.startTime, tz);
                        return moment().hours(start.hours()).minutes(start.minutes()).seconds(start.seconds());
                    });
                    return moment.min(openings);
                };

                self.getLatestClosing = function (room) {
                    var tz = room.localTimezone;
                    var closings = room.defaultWorkingHours.map(function (dwh) {
                        var end = moment.tz(dwh.endTime, tz);
                        return moment().hours(end.hours()).minutes(end.minutes()).seconds(end.seconds());
                    });
                    return moment.max(closings);
                };

                self.getClosedWeekdays = function (room) {
                    var weekdays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
                    var openedDays = room.defaultWorkingHours.map(function (dwh) {
                        return weekdays.indexOf(dwh.weekday);
                    });
                    return [0, 1, 2, 3, 4, 5, 6].filter(function (x) {
                        return openedDays.indexOf(x) === -1
                    });
                };


            }]);
}());
