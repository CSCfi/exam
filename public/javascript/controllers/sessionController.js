(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('SessionCtrl', ['$scope', '$localStorage', '$sessionStorage', '$location', '$http', '$modal', '$translate', 'authService', 'sessionService', 'SITNET_CONF',
            function ($scope, $localStorage, $sessionStorage, $location, $http, $modal, $translate, authService, sessionService, SITNET_CONF) {

                $scope.session = function () {
                    return sessionService;
                }

                $scope.switchLanguage = function (key) {
                    $translate.uses(key);
                    console.log($scope.user);
                };

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
                    var xhr = $http.post('/logout');
                    xhr.success(function (message) {
                        delete $localStorage[SITNET_CONF.AUTH_STORAGE_KEY];
                        delete $http.defaults.headers.common;
                        toastr.success("Uloskirjautuminen onnistui.");
                        $location.path("/");
                    });
                };

                $scope.login = function () {
                    var credentials = {
                        username: $scope.login.username,
                        password: $scope.login.password
                    };

                    var xhr = $http.post('/login', credentials, {
                        ignoreAuthModule: true
                    })

                    xhr.success(function (token) {
                        var header = {};
                        header[SITNET_CONF.AUTH_HEADER] = token.token;
                        $http.defaults.headers.common = header;
                        $localStorage[SITNET_CONF.AUTH_STORAGE_KEY] = token.token;
                        authService.loginConfirmed();
                        toastr.success($translate("sitnet_welcome") + " " + token.firstname + " " + token.lastname);

                        sessionService.user = {
                            firstname: token.firstname,
                            lastname: token.lastname
                        };
                    })

                    xhr.error(function (message) {
                        toastr.error(message, "Kirjautuminen epäonnistui!");
                    });
                };
            }]);
})();