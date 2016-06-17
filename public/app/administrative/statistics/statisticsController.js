(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('StatisticsController', ['$scope', '$translate', 'EXAM_CONF', 'ReportResource', 'RoomResource', 'dateService',
            function ($scope, $translate, EXAM_CONF, ReportResource, RoomResource, dateService) {

                $scope.dateService = dateService;
                $scope.templates = {
                    rooms: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/rooms.html",
                    exams: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/exams.html",
                    reservations: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/reservations.html",
                    responses: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/responses.html"
                };
                $scope.departments = [];
                $scope.limitations = {};

                $scope.exams = [];
                $scope.participations = {};

                ReportResource.departments.get(function (data) {
                    data.departments.forEach(function (d) {
                        $scope.departments.push({name: d});
                    });
                });

                var getQueryParams = function () {
                    var params = {};
                    if ($scope.dateService.startDate) {
                        params.start = Date.parse($scope.dateService.startDate);
                    }
                    if ($scope.dateService.endDate) {
                        params.end = Date.parse($scope.dateService.endDate);
                    }
                    var departments = $scope.departments.filter(function (d) {
                        return d.filtered;
                    });
                    if (departments.length > 0) {
                        params.dept = departments.map(function (d) {
                            return d.name;
                        }).join();
                    }
                    return params;
                };

                $scope.totalParticipations = function (month, room) {
                    var total = 0;

                    var isWithinBounds = function (p) {
                        var date = new Date(p.exam.created);
                        var current = new Date(month);
                        var min = new Date(current.getFullYear(), current.getMonth(), 1);
                        var max = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
                        return date > min && date < max;
                    };

                    for (var k in $scope.participations) {
                        if ($scope.participations.hasOwnProperty(k)) {
                            if (room && k !== room) {
                                continue;
                            }
                            if (month) {
                                total += $scope.participations[k].filter(isWithinBounds).length;
                            } else {
                                total += $scope.participations[k].length;
                            }
                        }
                    }
                    return total;
                };

                var isBefore = function (a, b) {
                    return a.getYear() < b.getYear() || (a.getYear() == b.getYear() && a.getMonth() < b.getMonth());
                };

                var groupByMonths = function () {
                    if ($scope.participations.length === 0) {
                        return [];
                    }
                    var months = [];
                    months.push($scope.minDate);
                    var current = new Date($scope.minDate);
                    var next = new Date(new Date(current).setMonth(current.getMonth() + 1));
                    var last = new Date($scope.maxDate);
                    while (isBefore(next, last)) {
                        months.push(next.getTime());
                        current = next;
                        next = new Date(new Date(current).setMonth(current.getMonth() + 1));
                    }
                    months.push($scope.maxDate);
                    $scope.months = months;
                };

                var setMinAndMaxDates = function () {
                    var dates = [];
                    for (var k in $scope.participations) {
                        if ($scope.participations.hasOwnProperty(k)) {
                            dates = dates.concat($scope.participations[k].map(function (p) {
                                return p.exam.created;
                            }));
                        }
                    }
                    $scope.minDate = Math.min.apply(null, dates);
                    // Set max date to either now or requested end date (if any)
                    if ($scope.dateService.endDate) {
                        dates.push(Date.parse($scope.dateService.endDate));
                    } else {
                        dates.push(new Date().getTime());
                    }
                    $scope.maxDate = Math.max.apply(null, dates);
                };

                $scope.listParticipations = function () {
                    ReportResource.participations.find(getQueryParams()).$promise.then(function (participations) {
                        $scope.participations = participations;
                        setMinAndMaxDates();
                        $scope.rooms = Object.keys(participations);
                        groupByMonths();
                    });
                };

                $scope.totalExams = function () {
                    return $scope.exams.reduce(function (a, b) {
                        return a + b.participations;
                    }, 0);
                };

                $scope.listExams = function () {
                    ReportResource.exams.query(getQueryParams(), function (exams) {
                        $scope.exams = exams;
                    });
                };

                $scope.getRank = function(index, items) {
                    var prev = Math.max(0, index - 1);
                    if (items[prev].participations === items[index].participations) {
                        items[index].rank = items[prev].rank || 0;
                        return (items[prev].rank || 0) + 1;
                    }
                    items[index].rank = index;
                    return index + 1;
                };

                $scope.listReservations = function () {
                    ReportResource.reservations.query(getQueryParams(), function (reservations) {
                        $scope.reservations = reservations.filter(function(r) {
                            return !r.noShow;
                        });
                        $scope.noShows = reservations.filter(function(r) {
                            return r.noShow;
                        });
                    });
                };

                $scope.listResponses = function () {
                    ReportResource.responses.query(getQueryParams(), function (exams) {
                        $scope.assessedExams = exams.filter(function(e) {
                            return ['GRADED', 'GRADED_LOGGED', 'ARCHIVED', 'REJECTED', 'DELETED'].indexOf(e.state) > -1;
                        });
                        $scope.unassessedExams = exams.filter(function(e) {
                            return ['STUDENT_STARTED', 'REVIEW', 'REVIEW_STARTED'].indexOf(e.state) > -1;
                        });
                        $scope.abortedExams = exams.filter(function(e) {
                            return e.state === 'ABORTED';
                        });
                    });
                };

            }]);
}());
