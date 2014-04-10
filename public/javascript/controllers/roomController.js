(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('RoomCtrl', ['$scope', 'RoomRes',
            function ($scope, RoomRes) {
                $scope.rooms = RoomRes.query();
        }]);
}());