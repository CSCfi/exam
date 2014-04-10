(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('RoomCtrl', ['$scope', 'RoomRes',
            function ($scope, RoomRes) {
                $scope.rooms = RoomRes.query();

                // Called when create exam button is clicked
                $scope.createExamRoom = function () {

                    ExamRes.draft.get(
                        function (response) {
                            toastr.info("Tenttiluonnos tehty.");
                            $location.path("/exams/" + response.id);
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };
        }]);
}());