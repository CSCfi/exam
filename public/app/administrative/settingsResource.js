(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("SettingsResource", ['$resource', function ($resource) {
            return {
                agreement: $resource("/app/settings/agreement", {}, {'update': {method: 'PUT'}}),
                deadline: $resource("/app/settings/deadline", {}, {"update": {method: 'PUT'}}),
                reservationWindow: $resource("/app/settings/reservationWindow", {}, {"update": {method: 'PUT'}}),
                hostname: $resource("/app/settings/hostname"),
                examDurations: $resource("/app/settings/durations"),
                gradeScale: $resource("/app/settings/gradescale"),
                enrolmentPermissions: $resource("/app/settings/enrolmentPermissionCheck"),
                environment: $resource("/app/settings/environment"),
                maxFilesize: $resource("/app/settings/maxfilesize"),
                appVersion : $resource("/app/settings/appVersion"),
                maturityInstructions: $resource("/app/settings/maturityInstructions")
            };
        }]);
}());
