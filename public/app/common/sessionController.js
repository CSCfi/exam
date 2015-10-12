(function () {
    // This is the controller for logging out and logging in if using dev type login. Haka initiated login is initiated
    // automatically by the run block in app.js
    'use strict';
    angular.module("exam.controllers")
        .controller('SessionCtrl', ['$scope', '$rootScope', '$location', '$translate', 'sessionService',
            'SettingsResource', 'EXAM_CONF',
            function ($scope, $rootScope, $location, $translate, sessionService, SettingsResource, EXAM_CONF) {

                $scope.credentials = {};
                $scope.env = {};

                SettingsResource.environment.get(function (env) {
                    $scope.env = env;
                    if (!env.isProd) {
                        $scope.loginTemplatePath = EXAM_CONF.TEMPLATES_PATH + "common/dev_login.html";
                    }
                });

                $scope.logout = function () {
                    sessionService.logout().then(function (data) {
                        delete $scope.user;
                        $rootScope.$broadcast('userUpdated');
                        toastr.success($translate.instant("sitnet_logout_success"));
                        if (data && data.logoutUrl) {
                            var returnUrl = window.location.protocol + "//" + window.location.host + "/Shibboleth.sso/Logout";
                            window.location.href = data.logoutUrl + "?return=" + returnUrl;
                        } else if ($scope.env.isProd) {
                            $scope.loginTemplatePath = EXAM_CONF.TEMPLATES_PATH + "common/logout.html";
                        } else {
                            $location.path("/login")
                        }
                    });
                };

                if ($location.url() == "/logout") {
                    if (sessionService.getUser()) {
                        $scope.logout();
                    }
                }

                $scope.switchLanguage = function (key) {
                    sessionService.switchLanguage(key);
                };

                $scope.login = function () {
                    sessionService.login($scope.credentials.username, $scope.credentials.password).then(function () {

                        var user = sessionService.getUser();
                        $rootScope.$broadcast('userUpdated');

                        var welcome = function () {
                            toastr.success($translate.instant("sitnet_welcome") + " " + user.firstname + " " + user.lastname);
                        };
                        setTimeout(welcome, 2000);
                        if (!user.loginRole) {
                            sessionService.openRoleSelectModal(user);
                        } else if (user.isStudent && !user.userAgreementAccepted) {
                            sessionService.openEulaModal(user);
                        } else if ($location.url() === '/login' || $location.url() === '/logout') {
                            $location.path("/");
                        }
                    }, function (message) {
                        if ($location.url() === '/login' || $location.url() === '/logout') {
                            $location.path("/logout");
                            toastr.error(message);
                        }
                    });
                };
            }
        ]);
}());