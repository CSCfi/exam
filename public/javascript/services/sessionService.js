(function () {
    'use strict';
    angular.module('sitnet.services', [])
        .factory('sessionService', function () {
            var session = {};
            console.log("inSessionService");
            return session;
        });
})();