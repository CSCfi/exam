(function () {
    'use strict';

    angular.module('exam.resources', []);
    angular.module('exam.controllers', []);
    angular.module('exam.services', []);
    angular.module('exam.directives', []);
    angular.module('exam.filters', []);
    angular.module('exam.utils', []);
    angular.module('exam', [
        'ngRoute',
        'ngResource',
        'ngStorage',
        'ngSanitize',
        'http-auth-interceptor',
        'ui.bootstrap',
        'ui.calendar',
        'ui.multiselect',
        'ui.select2',
        'dialogs.main',
        'pascalprecht.translate',
        'mgcrea.ngStrap.affix',
        'mgcrea.ngStrap.helpers.debounce', // required by affix
        'mgcrea.ngStrap.helpers.dimensions', // required by affix
        'tmh.dynamicLocale',
        'exam.services',
        'exam.controllers',
        'exam.resources',
        'exam.directives',
        'exam.filters',
        'exam.utils'])
        .constant('EXAM_CONF', {
            AUTH_STORAGE_KEY: 'EXAM_USER',
            AUTH_HEADER: 'x-exam-authentication',
            CONTEXT_PATH: '/',
            LANGUAGES_PATH: '/assets/assets/languages/',
            TEMPLATES_PATH: '/assets/app/'
        })
        .config(['$translateProvider', '$httpProvider', '$compileProvider', 'EXAM_CONF', function ($translateProvider, $httpProvider, $compileProvider, EXAM_CONF) {
            $compileProvider.debugInfoEnabled(false);
            $httpProvider.useApplyAsync(true);
            var path = EXAM_CONF.LANGUAGES_PATH;
            $translateProvider.useStaticFilesLoader({
                prefix: path + 'locale-',
                suffix: '.json'
            });
            $translateProvider.useSanitizeValueStrategy(null);
            $translateProvider.preferredLanguage('en');
        }])
        .run(['$http', '$route', '$interval', '$timeout', '$modal', '$sessionStorage', 'sessionService', 'EXAM_CONF',
            'authService', '$rootScope', '$translate', '$location', 'UserRes',
            function ($http, $route, $interval, $timeout, $modal, $sessionStorage, sessionService, EXAM_CONF,
                      authService, $rootScope, $translate, $location, UserRes) {

                var user = $sessionStorage[EXAM_CONF.AUTH_STORAGE_KEY];
                if (user) {
                    var header = {};
                    header[EXAM_CONF.AUTH_HEADER] = user.token;
                    $http.defaults.headers.common = header;
                    sessionService.setUser(user);
                    // Introduce a short timeout for this to give the translateProvider some time to settle
                    $timeout(function () {
                        sessionService.translate(user.lang);
                    }, 100);
                } else {
                    sessionService.switchLanguage('en');
                }
                var scheduler;
                var PING_INTERVAL = 60 * 1000;

                var checkSession = function () {
                    $http.get('/checkSession').success(function (data) {
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
                                "tapToDismiss": false,
                                "preventDuplicates": true
                            };
                            toastr.warning($translate("sitnet_session_will_expire_soon") +
                            "&nbsp;<button onclick=\"" +
                            "var request = new XMLHttpRequest();" +
                            "request.open('PUT', '/extendSession', true); " +
                            "request.setRequestHeader('" + EXAM_CONF.AUTH_HEADER + "', '" + user.token + "'); " +
                            "request.send();\">" +
                            $translate("sitnet_continue_session") + "</button>");
                        } else if (data === "no_session") {
                            if (scheduler) {
                                $interval.cancel(scheduler);
                            }
                            $location.path("/logout")
                        }
                    });
                };

                var restartSessionCheck = function () {
                    if (scheduler) {
                        $interval.cancel(scheduler);
                    }
                    scheduler = $interval(checkSession, PING_INTERVAL);
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
                        var welcome = function () {
                            toastr.success($translate.instant("sitnet_welcome") + " " + user.firstname + " " + user.lastname);
                        };
                        setTimeout(welcome, 2000);
                        restartSessionCheck();
                        if (user.isStudent && !user.hasAcceptedUserAgreament) {

                            $modal.open({
                                templateUrl: EXAM_CONF.TEMPLATES_PATH + 'common/show_eula.html',
                                backdrop: 'static',
                                keyboard: false,
                                controller: function ($scope, $modalInstance, sessionService) {

                                    $scope.ok = function () {
                                        console.log("ok");
                                        // OK button
                                        UserRes.updateAgreementAccepted.update({id: user.id}, function () {
                                            user.hasAcceptedUserAgreament = true;
                                            sessionService.setUser(user);
                                        }, function (error) {
                                            toastr.error(error.data);
                                        });
                                        $modalInstance.dismiss();
                                        if ($location.url() === '/login' || $location.url() === '/logout') {
                                            $location.path("/");
                                        } else {
                                            $route.reload();
                                        }
                                    };
                                    $scope.cancel = function () {
                                        $modalInstance.dismiss('cancel');
                                        $location.path("/logout");
                                    };
                                }
                            });
                        } else if ($location.url() === '/login' || $location.url() === '/logout') {
                            $location.path("/");
                        } else {
                            $route.reload();
                        }
                    }, function (message) {
                        if ($location.url() === '/login') {
                            toastr.error(message);
                            $location.path("/logout");
                        } else {
                            $location.path("/login");
                        }
                    });
                };

                if (!user) {
                    login();
                } else {
                    restartSessionCheck();
                }

            }]);
}());
