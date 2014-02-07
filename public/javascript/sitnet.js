(function () {
    'use strict';
    var sitnet = angular.module('sitnet', [
        'ngRoute',
        'ngResource',
        'http-auth-interceptor',
        'ui.bootstrap',
        'sitnet.controllers',
        'sitnet.resources'
    ]);
    sitnet.constant('SITNET_CONF', function () {
        var context_path = '/';
        return {
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
})();