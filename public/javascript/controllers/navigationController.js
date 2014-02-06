(function () {
    'use strict'
    angular.module("sitnet.controllers")
        .controller('vmenuCtrl', ['$scope', '$location', '$http', '$modal', function ($scope, $location, $http, $modal) {
            //todo: move dialog open to loginController.js
            var dialog;
            $scope.$on('event:auth-loginRequired', function () {
                dialog = $modal.open({
                    templateUrl: 'assets/templates/login.html',
                    backdrop: 'static',
                    keyboard: false,
                    controller: "LoginCtrl"
                });
            });
            $scope.$on('event:auth-loginConfirmed', function () {
                if (dialog !== undefined) {
                    dialog.close();
                }
            });
        }]);
})();