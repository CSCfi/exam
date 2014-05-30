(function () {
    'use strict';
    angular.module('sitnet.services', [])
        .factory('sessionService', function () {
            var sessionUser = {};

            var minimizeLibrary = false;
            var minimizeNavigation = false;
            var teacherQuestionExpanded = false;

            var login = function(/*params*/) {

              return sessionUser;
            };

            var logout = function(/*params*/) {

            };

            return {
                login : login,
                logout : logout,
                getUser : sessionUser
            };

            $scope.go = function (location) {
                $location.path(location);
            };

        });
}());
