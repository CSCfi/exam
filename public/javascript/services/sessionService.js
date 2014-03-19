(function () {
    'use strict';
    angular.module('sitnet.services', [])
        .factory('sessionService', function () {
            return {user: {}};
        });
}());
