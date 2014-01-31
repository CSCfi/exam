'use strict';
//see: http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/


var sitnet = angular.module('sitnet', ['ngRoute', 'ngResource'])
	.config(['$routeProvider', '$locationProvider', '$httpProvider', function($routeProvider, $locationProvider, $httpProvider) {
    
//	var access = routingConfig.accessLevels;
		
    //================================================
	// Define all the routes
	//===============================================
	$routeProvider.when('/login', 
		{
	    	templateUrl: 'assets/templates/login.html',
	    	controller: 'LoginCtrl'
//	    	access: access.anon
		});
	$routeProvider.when('/register',
        {
            templateUrl: 'register',
            controller: 'RegisterCtrl'
//            access: access.anon
        });
	$routeProvider.when('/about',
        {
            templateUrl: 'assets/templates/about.html'
//            controller: 'PrivateCtrl',
//            access:         access.user
        });
	$routeProvider.when('/admin',
        {
            templateUrl: 'admin',
            controller: 'AdminCtrl'
//            access:         access.admin
        });
	$routeProvider.when('/404',
        {
            templateUrl: '404'
//            access:         access.public
        });
	$routeProvider.otherwise({redirectTo: '/'});
	
	$locationProvider.html5Mode(true);
	
	//================================================
	// Define interceptor
	//===============================================
//	$httpProvider.interceptors.push(function($q, $location) {
//        return {
//            'responseError': function(response) {
//                if(response.status === 401 || response.status === 403) {
//                    $location.path('/login');
//                    return $q.reject(response);
//                }
//                else {
//                    return $q.reject(response);
//                }
//            }
//        }
//    });
	
	//================================================
	
}]) // end of config()
	.run(['$rootScope', '$location', '$http', function($rootScope, $location, $http){

		if('X-Sitnet-Authentication' in $http.defaults.headers.common === false) {
			$location.url('/login');
		}
		
		$rootScope.message = '';

		// Logout function is available in any pages
		$rootScope.logout = function(){
			$rootScope.message = 'Logged out.';
			$http.post('/logout');
		};
	}]);

sitnet.controller('LoginCtrl', ['$rootScope', '$scope', '$location', '$http', function($rootScope, $scope, $location, $http) {
	  // This object will be filled by the form
	  $scope.user = {};

	  // Register the login() function
	  $scope.login = function(){
	    $http.post('/login', {
	      username: $scope.user.username,
	      password: $scope.user.password
	    })
	    .success(function(token){
	    	$http.defaults.headers.common = { 'X-Sitnet-Authentication' : token };
	      // No error: authentication OK
	      $rootScope.message = 'Authentication successful!';
	      $location.url('/');
	    })
	    .error(function(){
	      // Error: authentication failed
	      $rootScope.message = 'Authentication failed.';
	      $location.url('/login');
	    });
	  };
	}]);