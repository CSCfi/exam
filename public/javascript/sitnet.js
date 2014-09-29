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
        'pascalprecht.translate',
        'ngDragDrop',
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
            LANGUAGES_PATH: context_path + 'assets/languages/',
            TEMPLATES_PATH: context_path + 'assets/templates/'
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
    sitnet.run(['$http', '$modal', '$localStorage', 'sessionService', 'SITNET_CONF', 'authService', '$rootScope', '$translate', '$location', 'UserRes',
        function ($http, $modal, $localStorage, sessionService, SITNET_CONF, authService, $rootScope, $translate, $location, UserRes) {

            $localStorage["LOCATION.PATH"] = $location.path();

            var user = $localStorage[SITNET_CONF.AUTH_STORAGE_KEY];
            if (user) {
                var header = {};

                header[SITNET_CONF.AUTH_HEADER] = user.token;
                $http.defaults.headers.common = header;
                sessionService.user = user;
            }
            var login = function () {
                var credentials = {
                    username: '',
                    password: ''
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
                        id: user.id,
                        firstname: user.firstname,
                        lastname: user.lastname,
                        isAdmin: (hasRole(user, 'ADMIN')),
                        isStudent: (hasRole(user, 'STUDENT')),
                        isTeacher: (hasRole(user, 'TEACHER')),
                        token: user.token,
                        hasAcceptedUserAgreament: user.hasAcceptedUserAgreament
                    };

                    $localStorage[SITNET_CONF.AUTH_STORAGE_KEY] = sessionUser;
                    sessionService.user = sessionUser;
                    authService.loginConfirmed();
                    $rootScope.$broadcast('userUpdated');
                    toastr.success($translate("sitnet_welcome") + " " + user.firstname + " " + user.lastname);
                    if (sessionUser.isStudent) {

                        if (!sessionUser.hasAcceptedUserAgreament) {

                            var modalInstance = $modal.open({

                                templateUrl: 'assets/templates/dialogs/show_eula.html',
                                backdrop: 'static',
                                keyboard: false,
                                controller: function($scope, $modalInstance, sessionService) {

                                    $scope.ok = function(){
                                        // OK button
                                        UserRes.updateAgreementAccepted.update({id: sessionUser.id}, function (user) {
                                            sessionService.user = user;
                                        }, function (error) {
                                            toastr.error(error.data);
                                        });
                                        $modalInstance.dismiss();
                                        if($localStorage["LOCATION.PATH"].indexOf("login") === -1) {
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

                        }
                    }
                    if($localStorage["LOCATION.PATH"].indexOf("login") === -1) {
                        $location.path($localStorage["LOCATION.PATH"]);
                        $localStorage["LOCATION.PATH"] = "";
                    } else {
                        $location.path("/home");
                    }
                });
                xhr.error(function (message) {
                    if($localStorage["LOCATION.PATH"].indexOf("login") === -1) {
                        $location.path($localStorage["LOCATION.PATH"]);
                        $localStorage["LOCATION.PATH"] = "";
                    } else {
                        toastr.error(message);
                        $location.path("/login");
                    }

                });
            };
            login();

            $http.get('/ping');
        }]);
}());