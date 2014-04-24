(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('TimepickerController', ['$scope', 'RoomResource',
            function ($scope, RoomResource) {

                $scope.startTime = new Date();
                $scope.endTime = new Date();

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
                    console.log('Start time hours: ' + $scope.startTime.getHours());
                    console.log('Start time minutes: ' + $scope.startTime.getMinutes());
                    console.log('Time is: ' + $scope.startTime.getTime());
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

                $scope.saveWorkingHours = function () {

                    var workingHoursToSave = {
                        "startTime": $scope.startTime,
                        "endTime": $scope.endTime
                    };

                    RoomResource.workinghours.update(workingHoursToSave,
                        function () {
                            toastr.info("Tenttitilan oletusajat päivitetty.");
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                }
            }])
}());
