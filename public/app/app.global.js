'use strict';

angular.module('app')
    // Lodash factory
    .factory('_', ['$window', function ($window) {
        return $window._;
    }]);