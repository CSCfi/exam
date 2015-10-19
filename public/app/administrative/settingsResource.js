(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("SettingsResource", ['$resource', function ($resource) {
            return {
                agreement: $resource("/settings/agreement", {}, {'update': {method: 'PUT'}}),
                deadline: $resource("/settings/deadline", {}, {"update": {method: 'PUT'}}),
                reservationWindow: $resource("/settings/reservationWindow", {}, {"update": {method: 'PUT'}}),
                hostname: $resource("/settings/hostname"),
                examDurations: $resource("/settings/durations"),
                gradeScale: $resource("/settings/gradescale"),
                enrolmentPermissions: $resource("/settings/enrolmentPermissionCheck"),
                environment: $resource("/settings/environment"),
                maxFilesize: $resource("/settings/maxfilesize"),
                appVersion : $resource("/settings/appVersion"),
                maturityInstructions: $resource("/settings/maturityInstructions")
            }
        }]);
}());
