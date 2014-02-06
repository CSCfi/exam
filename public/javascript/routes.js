'use strict';

sitnet.config(['$routeProvider', function ($routeProvider) {
    var assetUrl = 'assets/templates/';
    $routeProvider.when('/login', { templateUrl: assetUrl + 'login.html', controller: 'LoginCtrl' });
    $routeProvider.when('/about', { templateUrl: assetUrl + 'about.html', controller: 'TestCtrl' });
    $routeProvider.when('/users', { templateUrl: assetUrl + 'user.html', controller: 'UserCtrl'});
    $routeProvider.otherwise({redirectTo: '/'});
}]);