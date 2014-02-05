'use strict';

angular.module("sitnet.controllers")
    .controller('UserCtrl', ['$scope', 'UserRes', function ($scope, UserRes) {
        //todo: update list on action(save, delete update etc..)
        $scope.users = UserRes.query();

        $scope.createUser = function () {
            UserRes.save($scope.user, function (user) {
                toastr.info("Käyttäjä luotu onnistuneesti kanta id:llä: " + user.id, "Käyttäjä luotu.");
            });
        }
        
        $scope.delete = function (id) {
        	alert(id);
            UserRes.delete({'id':id});
        }
    }]);