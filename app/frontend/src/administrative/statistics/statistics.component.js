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

angular.module('app.administrative.statistics')
    .component('statistics', {
        templateUrl: '/assets/app/administrative/statistics/statistics.template.html',
        controller: ['$translate', 'EXAM_CONF', 'Statistics',
            function ($translate, EXAM_CONF, Statistics) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.templates = {
                        rooms: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/templates/rooms.html",
                        exams: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/templates/exams.html",
                        reservations: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/templates/reservations.html",
                        responses: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/templates/responses.html"
                    };
                    ctrl.departments = [];
                    ctrl.limitations = {};

                    ctrl.exams = [];
                    ctrl.participations = {};

                    Statistics.departments.get(function (data) {
                        data.departments.forEach(function (d) {
                            ctrl.departments.push({name: d});
                        });
                    });
                };

                var getQueryParams = function () {
                    var params = {};
                    if (ctrl.startDate) {
                        params.start = ctrl.startDate;
                    }
                    if (ctrl.endDate) {
                        params.end = ctrl.endDate;
                    }
                    var departments = ctrl.departments.filter(function (d) {
                        return d.filtered;
                    });
                    if (departments.length > 0) {
                        params.dept = departments.map(function (d) {
                            return d.name;
                        }).join();
                    }
                    return params;
                };

                ctrl.startDateChanged = function (date) {
                    ctrl.startDate = date;
                };

                ctrl.endDateChanged = function (date) {
                    ctrl.endDate = date;
                };

                ctrl.totalParticipations = function (month, room) {
                    var total = 0;

                    var isWithinBounds = function (p) {
                        var date = new Date(p.exam.created);
                        var current = new Date(month);
                        var min = new Date(current.getFullYear(), current.getMonth(), 1);
                        var max = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
                        return date > min && date < max;
                    };

                    for (var k in ctrl.participations) {
                        if (ctrl.participations.hasOwnProperty(k)) {
                            if (room && k !== room) {
                                continue;
                            }
                            if (month) {
                                total += ctrl.participations[k].filter(isWithinBounds).length;
                            } else {
                                total += ctrl.participations[k].length;
                            }
                        }
                    }
                    return total;
                };

                var isBefore = function (a, b) {
                    return a.getYear() < b.getYear() || (a.getYear() === b.getYear() && a.getMonth() < b.getMonth());
                };

                var groupByMonths = function () {
                    if (ctrl.participations.length === 0) {
                        return [];
                    }
                    var months = [];
                    months.push(ctrl.minDate);
                    var current = new Date(ctrl.minDate);
                    var next = new Date(new Date(current).setMonth(current.getMonth() + 1));
                    var last = new Date(ctrl.maxDate);
                    while (isBefore(next, last)) {
                        months.push(next.getTime());
                        current = next;
                        next = new Date(new Date(current).setMonth(current.getMonth() + 1));
                    }
                    months.push(ctrl.maxDate);
                    ctrl.months = months;
                };

                var setMinAndMaxDates = function () {
                    var dates = [];
                    for (var k in ctrl.participations) {
                        if (ctrl.participations.hasOwnProperty(k)) {
                            dates = dates.concat(ctrl.participations[k].map(function (p) {
                                return p.exam.created;
                            }));
                        }
                    }
                    ctrl.minDate = Math.min.apply(null, dates);
                    // Set max date to either now or requested end date (if any)
                    if (ctrl.endDate) {
                        dates.push(Date.parse(ctrl.endDate));
                    } else {
                        dates.push(new Date().getTime());
                    }
                    ctrl.maxDate = Math.max.apply(null, dates);
                };

                ctrl.listParticipations = function () {
                    Statistics.participations.find(getQueryParams()).$promise.then(function (participations) {
                        ctrl.participations = participations;
                        setMinAndMaxDates();
                        ctrl.rooms = Object.keys(participations);
                        groupByMonths();
                    });
                };

                ctrl.totalExams = function () {
                    return ctrl.exams.reduce(function (a, b) {
                        return a + b.participations;
                    }, 0);
                };

                ctrl.listExams = function () {
                    Statistics.exams.query(getQueryParams(), function (exams) {
                        ctrl.exams = exams;
                    });
                };

                ctrl.getRank = function (index, items) {
                    var prev = Math.max(0, index - 1);
                    if (items[prev].participations === items[index].participations) {
                        items[index].rank = items[prev].rank || 0;
                        return (items[prev].rank || 0) + 1;
                    }
                    items[index].rank = index;
                    return index + 1;
                };

                ctrl.listReservations = function () {
                    Statistics.reservations.query(getQueryParams(), function (reservations) {
                        ctrl.reservations = reservations.filter(function (r) {
                            return !r.noShow;
                        });
                        ctrl.noShows = reservations.filter(function (r) {
                            return r.noShow;
                        });
                    });
                };

                ctrl.listResponses = function () {
                    Statistics.responses.query(getQueryParams(), function (exams) {
                        ctrl.assessedExams = exams.filter(function (e) {
                            return ['GRADED', 'GRADED_LOGGED', 'ARCHIVED', 'REJECTED', 'DELETED'].indexOf(e.state) > -1;
                        });
                        ctrl.unassessedExams = exams.filter(function (e) {
                            return ['STUDENT_STARTED', 'REVIEW', 'REVIEW_STARTED'].indexOf(e.state) > -1;
                        });
                        ctrl.abortedExams = exams.filter(function (e) {
                            return e.state === 'ABORTED';
                        });
                    });
                };

            }]
    });

