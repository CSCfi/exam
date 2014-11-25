(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('TimepickerController', ['$scope', '$routeParams', 'RoomResource', 'dateService', '$translate',
            function ($scope, $routeParams, RoomResource, dateService, $translate) {

                $scope.dateService = dateService;
                $scope.exceptionStartTime = new Date();
                $scope.dateService.exceptionStartTime = $scope.exceptionStartTime;
                $scope.exceptionEndTime = new Date();
                $scope.dateService.exceptionEndTime = $scope.exceptionEndTime;

                if ($routeParams.id === undefined)
                    $scope.rooms = RoomResource.rooms.query();
                else {
                    RoomResource.rooms.get({id: $routeParams.id},
                        function (room) {
                            $scope.room = room;
                            $scope.calendarEvent = $scope.room.calendarEvent;

                            $scope.startTime = new Date($scope.calendarEvent.startTime);
                            $scope.endTime = new Date($scope.calendarEvent.endTime);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                }

                $scope.hourstep = 1;
                $scope.minutestep = 1;

                // Whether to display 12H or 24H mode
                $scope.ismeridian = false;

                $scope.startTimeChanged = function () {

                    if ($scope.startTime > $scope.endTime) {
                        $scope.endTime = $scope.startTime;
                    }

                    console.log('Start time changed to: ' + $scope.startTime);
                };

                $scope.endTimeChanged = function () {

                    if ($scope.endTime < $scope.startTime) {
                        $scope.endTime = $scope.startTime;
                        toastr.error($translate('sitnet_endtime_before_starttime'));
                    }

                    console.log('End time changed to: ' + $scope.endTime);
                };

                $scope.exceptionStartTimeChanged = function () {

                    if ($scope.exceptionStartTime > $scope.exceptionEndTime) {
                        $scope.exceptionEndTime = $scope.exceptionStartTime;
                    }

                    console.log('Exception start time changed to: ' + $scope.exceptionStartTime);

                    var startTime = $scope.exceptionStartTime.getTime();

                    $scope.dateService.exceptionStartTime = startTime;
                };

                $scope.exceptionEndTimeChanged = function () {

                    if ($scope.exceptionEndTime < $scope.exceptionStartTime) {
                        $scope.exceptionEndTime = $scope.exceptionStartTime;
                        toastr.error($translate('sitnet_endtime_before_starttime'));
                    }

                    console.log('Exception end time changed to: ' + $scope.exceptionEndTime);

                    $scope.dateService.exceptionEndTime = $scope.exceptionEndTime.getTime();
                };

                $scope.saveWorkingHours = function (calendarEvent) {
                    calendarEvent.startTime = $scope.startTime.getTime();
                    calendarEvent.endTime = $scope.endTime.getTime();

                    RoomResource.workinghours.update({id: calendarEvent.id}, calendarEvent,
                            function (workingHours) {
                            toastr.info($translate('sitnet_default_opening_hours_updated'));
                            console.log('Updated start time hours: ' + workingHours.startTime);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                }
            }])
}());
