(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("CalendarRes", ['$resource', function ($resource) {
            return {
                slots: $resource("/calendar/:eid/:rid", {eid: "@eid", rid: "@rid"})
            };
        }]);
}());
