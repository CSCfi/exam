var sitnetServices = angular.module('sitnetServices', ['ngResource']);

sitnetServices.factory('User', ['$resource',
    function($resource){
	   return $resource('users/:userId.json', {}, {
		  query: {method:'GET', params:{userId:'users'}, isArray:true}
	   });
	}]);