(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("SettingsResource", ['$resource', function ($resource) {
            return {
                agreement: $resource(
                    "/agreement", null,
                    {
                        'update':   {method: 'PUT'}
                    }),
                settings: $resource(
                    "/settings", null,
                    {
                        "update": { method: 'PUT'}
                    }),
                deadline: $resource("/settings/deadline"),
                hostname: $resource("/settings/hostname"),
                examDurations: $resource("/settings/durations"),
                gradeScale: $resource("/settings/gradescale"),
                enrolmentPermissions: $resource("/settings/enrolmentPermissionCheck"),
                environment: $resource("/settings/environment"),
                maxFilesize: $resource("/settings/maxfilesize")
            }
        }]);
}());