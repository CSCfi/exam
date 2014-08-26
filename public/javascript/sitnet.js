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
        'ui.select2'
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
    sitnet.run(['$http', '$localStorage', 'sessionService', 'SITNET_CONF', 'authService', '$rootScope', '$translate', '$location',
        function ($http, $localStorage, sessionService, SITNET_CONF, authService, $rootScope, $translate, $location) {
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
                        token: user.token
                    };
                    $localStorage[SITNET_CONF.AUTH_STORAGE_KEY] = sessionUser;
                    sessionService.user = sessionUser;
                    authService.loginConfirmed();
                    $rootScope.$broadcast('userUpdated');
                    toastr.success($translate("sitnet_welcome") + " " + user.firstname + " " + user.lastname);
                    $location.path("/home");
                });
            };
            login();

            $http.get('/ping');
        }]);
}());