(function () {
    // This is the controller for logging out and logging in if using dev type login. Haka initiated login is initiated
    // automatically by the run block in app.js
    'use strict';
    angular.module("exam.controllers")
        .controller('SessionCtrl', ['$scope', '$rootScope', '$location', '$translate', 'sessionService',
            'SettingsResource', 'EXAM_CONF',
            function ($scope, $rootScope, $location, $translate, sessionService, SettingsResource, EXAM_CONF) {

                $scope.credentials = {};

                var setLoginTemplate = function (env) {
                    if (!env.isProd) {
                        $scope.loginTemplatePath = EXAM_CONF.TEMPLATES_PATH + "common/dev_login.html";
                    }
                };

                var init = function () {
                    var env = sessionService.getEnv();
                    if (env) {
                        setLoginTemplate(env);
                    } else {
                        SettingsResource.environment.get(function (data) {
                            sessionService.setEnv(data);
                            setLoginTemplate(data);
                        });
                    }
                };

                init();

                $scope.logout = function () {
                    sessionService.logout().then(function (data) {
                        delete $scope.user;
                        $rootScope.$broadcast('userUpdated');
                        toastr.success($translate.instant("sitnet_logout_success"));
                        var localLogout = window.location.protocol + "//" + window.location.host + "/Shibboleth.sso/Logout";
                        if (data && data.logoutUrl) {
                            window.location.href = data.logoutUrl + "?return=" + localLogout;
                        } else if (!sessionService.getEnv() || sessionService.getEnv().isProd) {
                            // redirect to SP-logout directly
                            window.location.href = localLogout;
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
