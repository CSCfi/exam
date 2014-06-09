(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('UserCtrl', ['$scope', 'UserRes', function ($scope, UserRes) {

            $scope.createUser = function () {
                UserRes.users.save($scope.user, function (user) {
                    toastr.info("Käyttäjä lisätty.");
                });
            };

            $scope.delete = function (id) {
                UserRes.users.delete({'id': id}, function (reply) {
                    toastr.warning("Käyttäjä poistettu.");
                });
            };
        }]);
}());