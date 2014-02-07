(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('LoginCtrl', ['$scope', '$localStorage', '$sessionStorage', '$location', '$http', 'authService', 'SITNET_CONF',
            function ($scope, $localStorage, $sessionStorage, $location, $http, authService, SITNET_CONF) {
            $scope.user = {};
            $scope.$storage = $localStorage;
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
                        var header = {};
                        header[SITNET_CONF.AUTH_HEADER] = token;
                        $http.defaults.headers.common = header;
                        $localStorage = token;
                        authService.loginConfirmed();
                        toastr.success("Kirjautuminen onnistui!");
                    })
                    .error(function (message) {
                        toastr.error(message, "Kirjautuminen epäonnistui!");
                    });
            };
        }]);
})();