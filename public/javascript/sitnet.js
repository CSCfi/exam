'use strict';

/*


 console.log("run ran!");
 if ('X-Sitnet-Authentication' in $http.defaults.headers.common === false) {
 $location.url('/login');
 }


 */

var sitnet = angular.module('sitnet', [
    'ngRoute',
    'ngResource',
    'sitnet.controllers',
    'sitnet.resources'
]);

sitnet.config(['$httpProvider', function ($httpProvider) {
    var interceptor = function ($q) {
        return {
            'request': function (config) {
                console.log(config);
                return config || $q.when(config);
            },
            'response': function (config) {
                console.log(config);
                return config || $q.when(config);
            },
            'responseError': function (rejection) {
                // do something on error
                return $q.reject(rejection);
            }
        };
    };

    $httpProvider.interceptors.push(interceptor);
}]);
