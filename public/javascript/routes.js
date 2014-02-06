'use strict';

sitnet.config(['$routeProvider', function ($routeProvider) {
    var assetUrl = 'assets/templates/';

    /* main navigation */
    $routeProvider.when('/home', { templateUrl: assetUrl + 'home.html'});
    $routeProvider.when('/questions', { templateUrl: assetUrl + 'questions.html'});
    $routeProvider.when('/reports', { templateUrl: assetUrl + 'reports.html'});
    $routeProvider.when('/exams', { templateUrl: assetUrl + 'exams.html'});
    $routeProvider.when('/calendar', { templateUrl: assetUrl + 'calendar.html'});
    $routeProvider.when('/notifications', { templateUrl: assetUrl + 'notifications.html'});
    $routeProvider.when('/messages', { templateUrl: assetUrl + 'messages.html'});
    $routeProvider.when('/tools', { templateUrl: assetUrl + 'tools.html'});

    /* extra */
    $routeProvider.when('/users', { templateUrl: assetUrl + 'user.html', controller: 'UserCtrl'});
    $routeProvider.when('/about', { templateUrl: assetUrl + 'about.html', controller: 'TestCtrl' });
    $routeProvider.when('/login', { templateUrl: assetUrl + 'login.html', controller: 'LoginCtrl' });

    $routeProvider.otherwise({redirectTo: '/home'});
}]);