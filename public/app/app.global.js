'use strict';

angular.module('app')
    // Lodash factory
    .factory('lodash', ['$window', function ($window) {
        return $window._;
    }]);