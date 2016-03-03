(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("CalendarRes", ['$resource', function ($resource) {
            return {
                slots: $resource("/app/calendar/:eid/:rid", {eid: "@eid", rid: "@rid"})
            };
        }]);
}());
