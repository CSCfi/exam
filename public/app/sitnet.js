(function () {
    'use strict';
    var sitnet = angular.module('sitnet', [
        'ngRoute',
        'ngResource',
        'ngStorage',
        'http-auth-interceptor',
        'ui.bootstrap',
        'sitnet.services',
        'sitnet.controllers',
        'sitnet.resources',
        'sitnet.directives',
        'sitnet.filters',
        'sitnet.utils',
        'pascalprecht.translate',
        'ngSanitize',
        'mgcrea.ngStrap.helpers.dimensions',
        'mgcrea.ngStrap.helpers.debounce',
        'mgcrea.ngStrap.affix',
        'ui.calendar',
        'ui.multiselect',
        'ui.select2',
        'tmh.dynamicLocale'
    ]);
    sitnet.constant('SITNET_CONF', (function () {
        var context_path = '/';
        return {
            AUTH_STORAGE_KEY: 'SITNET_USER',
            AUTH_HEADER: 'x-sitnet-authentication',
            CONTEXT_PATH: context_path,
            LANGUAGES_PATH: context_path + 'assets/assets/languages/',
            TEMPLATES_PATH: context_path + 'assets/app/'
        };
    }()));
    sitnet.config(['$httpProvider', '$translateProvider', 'SITNET_CONF', function ($httpProvider, $translateProvider, SITNET_CONF) {

        var path = SITNET_CONF.LANGUAGES_PATH;
        $translateProvider.useStaticFilesLoader({
            prefix: path + '/locale-',
            suffix: '.json'
        });
        $translateProvider.preferredLanguage('fi');
    }]);
    sitnet.run(['$http', '$interval', '$modal', '$localStorage', 'sessionService', 'SITNET_CONF', 'authService', '$rootScope', '$translate', '$location', 'UserRes',
        function ($http, $interval, $modal, $localStorage, sessionService, SITNET_CONF, authService, $rootScope, $translate, $location, UserRes) {

            $localStorage["LOCATION.PATH"] = $location.path();

            var user = $localStorage[SITNET_CONF.AUTH_STORAGE_KEY];
            if (user) {
                var header = {};

                header[SITNET_CONF.AUTH_HEADER] = user.token;
                $http.defaults.headers.common = header;
                sessionService.setUser(user);
            }
            var scheduler = null;
            var PING_INTERVAL = 60 * 1000;

            var checkSession = function () {
                $http.get('/checkSession').success(function (data, status, headers, config) {
                    if (data === "alarm") {
                        toastr.options = {
                            "closeButton": false,
                            "debug": false,
                            "progressBar": false,
                            "positionClass": "toast-top-right",
                            "showDuration": "0",
                            "hideDuration": "0",
                            "timeOut": "30000",
                            "extendedTimeOut": "1000",
                            "tapToDismiss": false
                        },
                            toastr.options.preventDuplicates = true,
                            toastr.warning($translate("sitnet_session_will_expire_soon") + "  " + "<button onclick=\"javascript:$http.get('/extendSession')\">" + $translate("sitnet_continue_session") + "</button>");
                    } else if (data === "no_session") {
                        if (scheduler) {
                            $interval.cancel(scheduler);
                        }
                        $location.path("/logout")
                    }
                }).
                    error(function (data, status, headers, config) {

                    });
            };

            $rootScope.$on('$destroy', function () {
                if (scheduler) {
                    $interval.cancel(scheduler);
                }
            });

            var login = function () {
                sessionService.login('', '').then(function () {
                    var user = sessionService.getUser();
                    $rootScope.$broadcast('userUpdated');
                    toastr.success($translate("sitnet_welcome") + " " + user.firstname + " " + user.lastname);

                    scheduler = $interval(checkSession, PING_INTERVAL);
                    if (user.isStudent && !user.hasAcceptedUserAgreament) {

                        $modal.open({

                            templateUrl: SITNET_CONF.TEMPLATES_PATH + 'common/show_eula.html',
                            backdrop: 'static',
                            keyboard: false,
                            controller: function ($scope, $modalInstance, sessionService) {

                                $scope.ok = function () {
                                    console.log("ok");
                                    // OK button
                                    UserRes.updateAgreementAccepted.update({id: user.id}, function (user) {
                                        sessionService.setUser(user);
                                    }, function (error) {
                                        toastr.error(error.data);
                                    });
                                    $modalInstance.dismiss();
                                    if ($localStorage["LOCATION.PATH"].indexOf("login") === -1) {
                                        $location.path($localStorage["LOCATION.PATH"]);
                                        $localStorage["LOCATION.PATH"] = "";
                                    } else {
                                        $location.path("/home");
                                    }
                                };
                                $scope.cancel = function () {
                                    $modalInstance.dismiss('cancel');
                                    $location.path("/logout");
                                };
                            }
                        });
                    } else { // We might want to somehow redirect user to provided URL path here
                        if ($localStorage["LOCATION.PATH"].indexOf("login") === -1) {
                            $location.path($localStorage["LOCATION.PATH"]);
                            $localStorage["LOCATION.PATH"] = "";
                        } else {
                            $location.path("/home");
                        }
                    }
                }, function (message) {
                    if ($localStorage["LOCATION.PATH"].indexOf("login") === -1) {
                        $location.path($localStorage["LOCATION.PATH"]);
                        $localStorage["LOCATION.PATH"] = "";
                    } else {
                        toastr.error(message);
                        $location.path("/login");
                    }
                });
            };

            login();

        }]);
}());