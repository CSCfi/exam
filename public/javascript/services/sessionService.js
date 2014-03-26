(function () {
    'use strict';
    angular.module('sitnet.services', [])
        .factory('sessionService', function () {
            var sessionUser = {};

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
        });
}());
