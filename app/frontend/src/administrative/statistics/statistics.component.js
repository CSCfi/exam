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

angular.module('app.administrative.statistics')
    .component('statistics', {
        template: require('./statistics.template.html'),
        controller: ['$translate', 'EXAM_CONF', 'Statistics',
            function ($translate, EXAM_CONF, Statistics) {

                const vm = this;

                vm.$onInit = function () {
                    vm.templates = {
                        rooms: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/templates/rooms.html",
                        exams: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/templates/exams.html",
                        reservations: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/templates/reservations.html",
                        responses: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/templates/responses.html"
                    };
                    vm.departments = [];
                    vm.limitations = {};

                    vm.exams = [];
                    vm.participations = {};

                    Statistics.departments.get(function (data) {
                        data.departments.forEach(function (d) {
                            vm.departments.push({name: d});
                        });
                    });
                };

                const getQueryParams = function () {
                    const params = {};
                    if (vm.startDate) {
                        params.start = vm.startDate;
                    }
                    if (vm.endDate) {
                        params.end = vm.endDate;
                    }
                    const departments = vm.departments.filter(function (d) {
                        return d.filtered;
                    });
                    if (departments.length > 0) {
                        params.dept = departments.map(function (d) {
                            return d.name;
                        }).join();
                    }
                    return params;
                };

                vm.startDateChanged = function (date) {
                    vm.startDate = date;
                };

                vm.endDateChanged = function (date) {
                    vm.endDate = date;
                };

                vm.totalParticipations = function (month, room) {
                    let total = 0;

                    const isWithinBounds = function (p) {
                        const date = new Date(p.exam.created);
                        const current = new Date(month);
                        const min = new Date(current.getFullYear(), current.getMonth(), 1);
                        const max = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
                        return date > min && date < max;
                    };

                    for (let k in vm.participations) {
                        if (vm.participations.hasOwnProperty(k)) {
                            if (room && k !== room) {
                                continue;
                            }
                            if (month) {
                                total += vm.participations[k].filter(isWithinBounds).length;
                            } else {
                                total += vm.participations[k].length;
                            }
                        }
                    }
                    return total;
                };

                const isBefore = function (a, b) {
                    return a.getYear() < b.getYear() || (a.getYear() === b.getYear() && a.getMonth() < b.getMonth());
                };

                const groupByMonths = function () {
                    if (vm.participations.length === 0) {
                        return [];
                    }
                    const months = [];
                    months.push(vm.minDate);
                    let current = new Date(vm.minDate);
                    let next = new Date(new Date(current).setMonth(current.getMonth() + 1));
                    const last = new Date(vm.maxDate);
                    while (isBefore(next, last)) {
                        months.push(next.getTime());
                        current = next;
                        next = new Date(new Date(current).setMonth(current.getMonth() + 1));
                    }
                    months.push(vm.maxDate);
                    vm.months = months;
                };

                const setMinAndMaxDates = function () {
                    let dates = [];
                    for (let k in vm.participations) {
                        if (vm.participations.hasOwnProperty(k)) {
                            dates = dates.concat(vm.participations[k].map(function (p) {
                                return p.exam.created;
                            }));
                        }
                    }
                    vm.minDate = Math.min.apply(null, dates);
                    // Set max date to either now or requested end date (if any)
                    if (vm.endDate) {
                        dates.push(Date.parse(vm.endDate));
                    } else {
                        dates.push(new Date().getTime());
                    }
                    vm.maxDate = Math.max.apply(null, dates);
                };

                vm.listParticipations = function () {
                    Statistics.participations.find(getQueryParams()).$promise.then(function (participations) {
                        vm.participations = participations;
                        setMinAndMaxDates();
                        vm.rooms = Object.keys(participations);
                        groupByMonths();
                    });
                };

                vm.totalExams = function () {
                    return vm.exams.reduce(function (a, b) {
                        return a + b.participations;
                    }, 0);
                };

                vm.listExams = function () {
                    Statistics.exams.query(getQueryParams(), function (exams) {
                        vm.exams = exams;
                    });
                };

                vm.getRank = function (index, items) {
                    const prev = Math.max(0, index - 1);
                    if (items[prev].participations === items[index].participations) {
                        items[index].rank = items[prev].rank || 0;
                        return (items[prev].rank || 0) + 1;
                    }
                    items[index].rank = index;
                    return index + 1;
                };

                vm.listReservations = function () {
                    Statistics.reservations.query(getQueryParams(), function (reservations) {
                        vm.reservations = reservations.filter(function (r) {
                            return !r.noShow;
                        });
                        vm.noShows = reservations.filter(function (r) {
                            return r.noShow;
                        });
                    });
                };

                vm.listResponses = function () {
                    Statistics.responses.query(getQueryParams(), function (exams) {
                        vm.assessedExams = exams.filter(function (e) {
                            return ['GRADED', 'GRADED_LOGGED', 'ARCHIVED', 'REJECTED', 'DELETED'].indexOf(e.state) > -1;
                        });
                        vm.unassessedExams = exams.filter(function (e) {
                            return ['STUDENT_STARTED', 'REVIEW', 'REVIEW_STARTED'].indexOf(e.state) > -1;
                        });
                        vm.abortedExams = exams.filter(function (e) {
                            return e.state === 'ABORTED';
                        });
                    });
                };

            }]
    });

