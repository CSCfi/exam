(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('RoomCtrl', ['$scope', 'RoomRes', 'SITNET_CONF','$routeParams',
            function ($scope, RoomRes, SITNET_CONF, $routeParams) {

                $scope.machineTemplate = SITNET_CONF.TEMPLATES_PATH + "admin/machine.html";


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