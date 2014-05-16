(function () {
    'use strict';
    angular.module('sitnet.filters')
        .filter('newlines', function (text) {
            return text.replace(/\n/g, '');
        });
}());