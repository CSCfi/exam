(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('SessionCtrl', ['$scope', '$localStorage', '$sessionStorage', '$location', '$http', '$modal', 'authService', 'SITNET_CONF',
            function ($scope, $localStorage, $sessionStorage, $location, $http, $modal, authService, SITNET_CONF) {
                $scope.user = {};

                var dialog;
                $scope.$on('event:auth-loginRequired', function () {
                    dialog = $modal.open({
                        templateUrl: 'assets/templates/login.html',
                        backdrop: 'static',
                        keyboard: false,
                        controller: "SessionCtrl"
                    });
                });

                $scope.$on('event:auth-loginConfirmed', function () {
                    if (dialog) {
                        dialog.close();
                    }
                });

                $scope.logout = function () {
                    $http.post('/logout').
                        success(function (message) {
                            delete $localStorage[SITNET_CONF.AUTH_STORAGE_KEY];
                            delete $http.defaults.headers.common;
                            toastr.success("Uloskirjautuminen onnistui.");
                            //todo: go to page where session is not needed
                            $location.path("/");
                        });
                };

                $scope.login = function () {
                    var credentials = {
                        username: $scope.user.username,
                        password: $scope.user.password
                    };
                    $http.post('/login', credentials, {
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