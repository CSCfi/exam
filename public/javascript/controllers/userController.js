'use strict';

angular.module("sitnet.controllers")
    .controller('UserCtrl', ['$scope', 'UserRes', function ($scope, userRes) {
        //todo: update list on action(save, delete update etc..)
        $scope.users = userRes.query();

        $scope.createUser = function () {
            userRes.save($scope.user, function (user) {
                toastr.info("Käyttäjä luotu onnistuneesti kanta id:llä: " + user.id, "Käyttäjä luotu.");
            });
        }
        $scope.delete = function (id) {
            userRes.delete(id);
        }
    }]);