'use strict';

angular
    .module("administrative.reports")
    .factory('Reports', ['$resource',
        function ($resource) {
            return {examNames: $resource("/app/statistics/examnames")};
        }
    ]);

