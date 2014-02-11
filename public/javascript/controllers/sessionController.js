(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('LoginCtrl', ['$scope', '$localStorage', '$sessionStorage', '$location', '$http', 'authService', 'SITNET_CONF',
            function ($scope, $localStorage, $sessionStorage, $location, $http, authService, SITNET_CONF) {
                $scope.user = {};

                $scope.logout = function () {
                    $http.post('/logout').
                        success(function (message) {
                            delete $localStorage[SITNET_CONF.AUTH_STORAGE_KEY];
                            toastr.success("Uloskirjautuminen onnistui.");
                            //todo: go to page where session is not needed
                            $location.path("/home");
                        });
                };

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
                        .success(function (token) {
                            var header = {};
                            header[SITNET_CONF.AUTH_HEADER] = token.token;
                            $http.defaults.headers.common = header;
                            $localStorage[SITNET_CONF.AUTH_STORAGE_KEY] = token.token;
                            authService.loginConfirmed();
                            toastr.success("Tervetuloa " + token.firstname + " " + token.lastname);

                            $scope.user.firstname = token.firstname;
                            $scope.user.lastname = token.lastname;
                        })
                        .error(function (message) {
                            toastr.error(message, "Kirjautuminen epäonnistui!");
                        });
                };
            }]);
})();