(function () {
    'use strict';
    var sitnet = angular.module('sitnet', [
        'ngRoute',
        'ngResource',
        'ngStorage',
        'http-auth-interceptor',
        'ui.bootstrap',
        'sitnet.controllers',
        'sitnet.resources'
    ]);
    sitnet.constant('SITNET_CONF', function () {
        var context_path = '/';
        return {
            AUTH_STORAGE_KEY: 'SITNET_TOKEN',
            AUTH_HEADER: 'x-sitnet-authentication',
            CONTEXT_PATH: context_path,
            ASSETS_PATH: context_path + 'assets'
        };
    }());
    sitnet.config(['$httpProvider', function ($httpProvider) {
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
            var header = {};
            header[SITNET_CONF.AUTH_HEADER] = $localStorage[SITNET_CONF.AUTH_STORAGE_KEY];
            $http.defaults.headers.common = header;
            $http.get('/ping');
        }]);
})();