(function () {
    'use strict';

    angular.module('exam.resources', []);
    angular.module('exam.controllers', []);
    angular.module('exam.services', []);
    angular.module('exam.directives', []);
    angular.module('exam.filters', []);
    angular.module('exam.utils', []);
    angular.module('exam', [
            'ngAnimate',
            'ngCookies',
            'ngResource',
            'ngRoute',
            'ngSanitize',
            'ngStorage',
            'ngPromiseExtras',
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
        .config(['$translateProvider', '$httpProvider', '$compileProvider', 'EXAM_CONF',
            function ($translateProvider, $httpProvider, $compileProvider, EXAM_CONF) {
                $compileProvider.debugInfoEnabled(false);
                $httpProvider.useApplyAsync(true);

                // IE caches each and every GET unless the following is applied:
                if (!$httpProvider.defaults.headers.get) {
                    $httpProvider.defaults.headers.get = {};
                }
                $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
                $httpProvider.defaults.headers.get['Pragma'] = 'no-cache';

                var path = EXAM_CONF.LANGUAGES_PATH;
                $translateProvider.useStaticFilesLoader({
                    prefix: path + 'locale-',
                    suffix: '.json'
                });
                $translateProvider.useSanitizeValueStrategy(null);
                $translateProvider.preferredLanguage('en');
            }])
        .run(['$http', '$route', '$interval', '$timeout', '$sessionStorage', 'sessionService', 'EXAM_CONF',
            function ($http, $route, $interval, $timeout, $sessionStorage, sessionService, EXAM_CONF) {

                var user = $sessionStorage[EXAM_CONF.AUTH_STORAGE_KEY];
                if (user) {
                    if (!user.loginRole) {
                        // This happens if user refreshes the tab before having selected a login role,
                        // lets just throw him out.
                        sessionService.logout();
                    }
                    var header = {};
                    header[EXAM_CONF.AUTH_HEADER] = user.token;
                    $http.defaults.headers.common = header;
                    sessionService.setUser(user);
                    sessionService.translate(user.lang);
                    sessionService.restartSessionCheck();
                } else {
                    sessionService.switchLanguage('en');
                    sessionService.login('', '');
                }
            }
        ]);

}());
