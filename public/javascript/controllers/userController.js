(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('UserCtrl', ['$scope', 'UserRes', function ($scope, UserRes) {
            $scope.users = UserRes.query();

            $scope.createUser = function () {
                UserRes.save($scope.user, function (user) {
                    toastr.info("Käyttäjä lisätty.");
                });
            };

            $scope.delete = function (id) {
                UserRes.delete({'id': id}, function (reply) {
                    toastr.warning("Käyttäjä poistettu.");
                });
            };
        }]);
}());