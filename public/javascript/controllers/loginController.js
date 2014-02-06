(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('LoginCtrl', ['$scope', '$location', '$http', 'authService', function ($scope, $location, $http, authService) {
            $scope.user = {};
            $scope.login = function () {
                var credentials = {
                    username: $scope.user.username,
                    password: $scope.user.password
                };
                $http({
                    method: 'POST',
                    url: '/login',
                    data: credentials,
                    ignoreAuthModule: true
                })
                    .success(function (token, status) {
                        $http.defaults.headers.common = { 'x-sitnet-authentication': token };
                        authService.loginConfirmed();
                        toastr.success("Kirjautuminen onnistui!");
                    })
                    .error(function (message) {
                        toastr.error(message, "Kirjautuminen epäonnistui!");
                    });
            };
        }]);
})();