'use strict';

angular.module('app')
    // Lodash factory
    .factory('lodash', ['$window', function ($window) {
        return $window._;
    }])
    // Toastr factory
    .factory('toast', ['$window', function ($window) {
        var toast = $window.toastr;
        toast.options.preventDuplicates = true;
        return toast;
    }]);