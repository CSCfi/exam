(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('StatisticsController', ['$scope', '$translate', 'EXAM_CONF', 'ReportResource', 'RoomResource', 'dateService', '$filter', 'UserRes', 'fileService',
            function ($scope, $translate, EXAM_CONF, ReportResource, RoomResource, dateService, $filter, UserRes, fileService) {

                $scope.dateService = dateService;
                $scope.templates = {
                    rooms: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/rooms.html",
                    exams: EXAM_CONF.TEMPLATES_PATH + "administrative/statistics/exams.html"
                };
                $scope.departments = [];
                $scope.limitations = {};

                $scope.exams = [];
                $scope.participations = {};

                ReportResource.departments.get(function (data) {
                    data.departments.forEach(function (d) {
                        $scope.departments.push({name: d})
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
                            return d.name
                        }).join();
                    }
                    return params;
                };

                $scope.totalParticipations = function () {
                    var total = 0;
                    for (var k in $scope.participations) {
                        if ($scope.participations.hasOwnProperty(k)) {
                            total += $scope.participations[k].length;
                        }
                    }
                    return total;
                };

                $scope.listParticipations = function () {
                    ReportResource.participations.find(getQueryParams()).$promise.then(function (participations) {
                        $scope.participations = participations;
                    });
                };

                $scope.totalExams = function () {
                    return $scope.exams.reduce(function (a, b) {
                        return a + b.participations;
                    }, 0);
                };

                $scope.totalOwners = function () {
                    return $scope.exams.reduce(function (a, b) {
                        return a + b.owners;
                    }, 0);
                };

                $scope.listExams = function () {
                    ReportResource.exams.query(getQueryParams(), function(exams) {
                        $scope.exams = exams;
                    });
                };
            }]);
}());