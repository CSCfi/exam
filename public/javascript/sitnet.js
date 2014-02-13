(function () {
    'use strict';
    var sitnet = angular.module('sitnet', [
        'ngRoute',
        'ngResource',
        'ngStorage',
        'http-auth-interceptor',
        'ui.bootstrap',
        'sitnet.controllers',
        'sitnet.resources',
        'pascalprecht.translate'
    ]);
    sitnet.constant('SITNET_CONF', function () {
        var context_path = '/';
        return {
            AUTH_STORAGE_KEY: 'SITNET_TOKEN',
            AUTH_HEADER: 'x-sitnet-authentication',
            CONTEXT_PATH: context_path,
            ASSETS_PATH: context_path + 'assets',
            ASSETS_LANGUAGES: context_path + 'assets/languages'
        };
    }());
    sitnet.config(['$httpProvider', '$translateProvider', 'SITNET_CONF', function ($httpProvider, $translateProvider, SITNET_CONF) {

        var path = SITNET_CONF.ASSETS_LANGUAGES;

        // https://github.com/PascalPrecht/angular-translate/wiki/Asynchronous-loading#registering-asynchronous-loaders
        $translateProvider.useStaticFilesLoader({
            prefix: path+ '/locale-',
            suffix: '.json'
        });
        $translateProvider.preferredLanguage('en');

        var interceptor = function ($q) {
            return {
                'request': function (config) {
                    return config || $q.when(config);
                },
                'response': function (config) {
                    return config || $q.when(config);
                },
                'responseError': function (rejection) {
                    return $q.reject(rejection);
                }
            };
        };
        $httpProvider.interceptors.push(interceptor);
    }]);
    sitnet.run(['$http', '$localStorage', 'SITNET_CONF',
        function ($http, $localStorage, SITNET_CONF) {
            var token = $localStorage[SITNET_CONF.AUTH_STORAGE_KEY];
            if (token) {
                var header = {};
                header[SITNET_CONF.AUTH_HEADER] = token;
                $http.defaults.headers.common = header;
            }
            $http.get('/ping');
        }]);
})();