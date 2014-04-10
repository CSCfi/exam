(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('RoomCtrl', ['$scope', 'RoomRes', '$location', '$routeParams',
            function ($scope, RoomRes, $location, $routeParams) {

                if ($routeParams.id === undefined)
                    $scope.rooms = RoomRes.rooms.query();
                else {
                    RoomRes.rooms.get({id: $routeParams.id},
                        function (room) {
                            $scope.roomInstance = room;
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                }

                // Called when create exam button is clicked
                $scope.createExamRoom = function () {
                    RoomRes.draft.get(
                        function (room) {
                            $scope.roomInstance = room;
                            toastr.info("Tenttitilan luonnos tehty.");
                            $location.path("/rooms/" + room.id);
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };
        }]);
}());