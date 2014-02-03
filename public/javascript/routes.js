'use strict';

sitnet.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/login',  { templateUrl: 'assets/templates/login.html', controller: 'LoginCtrl' });
    $routeProvider.when('/about', { templateUrl: 'assets/templates/about.html' });
    $routeProvider.when('/user',{ templateUrl: 'admin',controller: 'UserCtrl'});
    $routeProvider.otherwise({redirectTo: '/'});
}]);