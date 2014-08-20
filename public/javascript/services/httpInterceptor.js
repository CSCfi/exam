(function () {
    'use strict';
    angular.module('sitnet.services')
        .service('httpInterceptor', [
            function () {
            }
        ]).config(['$httpProvider', function ($httpProvider) {
            $httpProvider.interceptors.push(['$rootScope' , '$q', function ($rootScope, $q) {
                return {
                    'responseError': function (rejection) {
                        if (rejection.headers()['x-sitnet-token-failure'] === 'Invalid token') {
                            $rootScope.$broadcast('invalidToken');
                        }
                        return $q.reject(rejection);
                    }
                };
            }]);
        }]);
}());