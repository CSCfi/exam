(function () {
    'use strict';
    angular.module('app.facility')
        .controller('RoomCtrl', ['$scope', '$routeParams', 'Session', '$location', '$uibModal', '$http',
            'Room', 'Machines', 'EXAM_CONF', 'DateTime', '$translate', 'toast',
            function ($scope, $routeParams, Session, $location, $modal, $http,
                      Room, Machines, EXAM_CONF, DateTime, $translate, toast) {

                $scope.DateTime = DateTime;

                $scope.machineTemplate = EXAM_CONF.TEMPLATES_PATH + "facility/machine.html";
                $scope.user = Session.getUser();

                if ($scope.user.isAdmin) {
                    if (!$routeParams.id) {
                        Room.rooms.query(function (rooms) {
                            $scope.times = Room.getTimes();
                            $scope.rooms = rooms;
                            angular.forEach($scope.rooms, function (room) {
                                room.examMachines = room.examMachines.filter(function (machine) {
                                    return !machine.archived;
                                });
                            });
                        });
                    }
                }
                else {
                    $location.path("/");
                }

                $scope.disableRoom = function (room) {
                    Room.disableRoom(room);
                };

                $scope.enableRoom = function (room) {
                    Room.enableRoom(room);
                };

                // Called when create exam button is clicked
                $scope.createExamRoom = function () {
                    Room.draft.get(
                        function (room) {
                            toast.info($translate.instant("sitnet_room_draft_created"));
                            $location.path("/rooms/" + room.id);
                        }, function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                $scope.editMultipleRooms = function () {
                    $location.path("/rooms_edit/edit_multiple");
                };

                $scope.isArchived = function (machine) {
                    return machine.isArchived() === false;
                };

                $scope.displayAddress = function (address) {

                    if (!address || (!address.street && !address.city && !address.zip)) return "N/A";
                    var street = address.street ? address.street + ", " : "";
                    var city = (address.city || "").toUpperCase();
                    return street + address.zip + " " + city;
                };

            }]);
}());
