'use strict';

angular.module("sitnet.controllers")
    .controller('LoginCtrl', ['$scope', '$location', '$http', function ($scope, $location, $http) {
        $scope.user = {};
        $scope.login = function () {
            $http.post('/login', {
                username: $scope.user.username,
                password: $scope.user.password
            })
                .success(function (token) {
                    $http.defaults.headers.common = { 'X-Sitnet-Authentication': token };
                    toastr.success("Kirjautuminen onnistui!");
                    $location.url('/');
                })
                .error(function (message) {
                    toastr.error(message, "Kirjautuminen epäonnistui!");
                    $location.url('/login');
                });
        };
    }]);