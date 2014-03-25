(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('SessionCtrl', ['$scope', '$rootScope', '$localStorage', '$sessionStorage', '$location', '$http', '$modal', '$translate', 'authService', 'sessionService', 'SITNET_CONF',
            function ($scope, $rootScope, $localStorage, $sessionStorage, $location, $http, $modal, $translate, authService, sessionService, SITNET_CONF) {

                $scope.session = sessionService;

                $scope.switchLanguage = function (key) {
                    $translate.uses(key);
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
                    if (dialog !== undefined) {
                        dialog.close();
                    }
                });

                $scope.logout = function () {
                    var xhr = $http.post('/logout');
                    xhr.success(function (message) {
                        delete $localStorage[SITNET_CONF.AUTH_STORAGE_KEY];
                        delete $http.defaults.headers.common;
                        toastr.success("Uloskirjautuminen onnistui.");
                        delete $scope.session.user;
                        $rootScope.$broadcast('userUpdated');
                        $location.path("/login");
                    });
                };

                $scope.login = function () {
                    var credentials = {
                        username: $scope.login.username,
                        password: $scope.login.password
                    };
                    var xhr = $http.post('/login', credentials, {
                        ignoreAuthModule: true
                    });
                    xhr.success(function (user) {

                        var hasRole = function (user, role) {
                                if (!user || !user.roles) {
                                    return false;
                                }
                                var i = user.roles.length;
                                while (i--) {
                                    if (user.roles[i].name === role) {
                                        return true;
                                    }
                                }
                                return false;
                            },
                            header = {};
                        header[SITNET_CONF.AUTH_HEADER] = user.token;
                        $http.defaults.headers.common = header;
                        var sessionUser = {
                            firstname: user.firstname,
                            lastname: user.lastname,
                            isAdmin: (hasRole(user, 'ADMIN')),
                            isStudent: (hasRole(user, 'STUDENT')),
                            isTeacher: (hasRole(user, 'TEACHER')),
                            token: user.token
                        };
                        $localStorage[SITNET_CONF.AUTH_STORAGE_KEY] = sessionUser;
                        $scope.session.user = sessionUser;
                        authService.loginConfirmed();
                        $rootScope.$broadcast('userUpdated');
                        toastr.success($translate("sitnet_welcome") + " " + user.firstname + " " + user.lastname);
                    });
                    xhr.error(function (message) {
                        toastr.error(message, "Kirjautuminen epäonnistui!");
                    });
                };
            }]);
}());