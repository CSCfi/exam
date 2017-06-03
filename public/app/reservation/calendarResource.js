'use strict';
angular.module('app.reservation')
    .factory("CalendarRes", ['$resource', function ($resource) {
        return {
            slots: $resource("/app/calendar/:eid/:rid", {eid: "@eid", rid: "@rid"}),
            reservationWindow: $resource("/app/settings/reservationWindow")
        };
    }]);
