'use strict';

angular
    .module('app.administrative.reports')
    .factory('Reports', ['$resource',
        function ($resource) {
            return {examNames: $resource("/app/statistics/examnames")};
        }
    ]);

