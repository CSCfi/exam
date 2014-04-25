(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('TimepickerController', ['$scope', '$routeParams', 'RoomResource',
            function ($scope, $routeParams, RoomResource) {

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

//                if ($scope.roomInstance.startTime == null) {
//                    $scope.startTime = new Date();
//                } else {
//                    $scope.startTime = $scope.roomInstance.startTime;
//                }
//
//                if ($scope.roomInstance.endTime == null) {
//                    $scope.endTime = new Date();
//                } else {
//                    $scope.endTime = $scope.roomInstance.endTime;
//                }

                $scope.hourstep = 1;
                $scope.minutestep = 1;

//                $scope.options = {
//                    hstep: [1, 2, 3],
//                    mstep: [1, 5, 10, 15, 25, 30]
//                };

                // Whether to display 12H or 24H mode
                $scope.ismeridian = false;

//                $scope.toggleMode = function() {
//                    $scope.ismeridian = ! $scope.ismeridian;
//                };

//                $scope.update = function() {
//                    var d = new Date();
//                    d.setHours( 14 );
//                    d.setMinutes( 0 );
//                    $scope.mytime = d;
//                };

                $scope.startTimeChanged = function () {

                    if ($scope.startTime > $scope.endTime) {
                        $scope.endTime = $scope.startTime;
                    }

                    console.log('Start time changed to: ' + $scope.startTime);
//                    console.log('Start time hours: ' + $scope.startTime.getHours());
                };

                $scope.endTimeChanged = function () {

                    if ($scope.endTime < $scope.startTime) {
                        $scope.endTime = $scope.startTime;
                        toastr.success("Loppuaika ei voi olla pienempi kuin alkuaika!");
                    }
//                    console.log('End time changed to: ' + $scope.endTime);
                };

//                $scope.clear = function() {
//                    $scope.mytime = null;
//                };

                $scope.saveWorkingHours = function (calendarEvent) {
                    calendarEvent.startTime = $scope.startTime.getTime();
                    calendarEvent.endTime = $scope.endTime.getTime();

                    RoomResource.workinghours.update({id: calendarEvent.id}, calendarEvent,
                            function (workingHours) {
                            toastr.info("Tenttitilan oletusajat päivitetty.");
                            console.log('Updated start time hours: ' + workingHours.startTime);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                }
            }])
}());
