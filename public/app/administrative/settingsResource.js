(function () {
    'use strict';
    angular.module("exam.resources")
        .factory("SettingsResource", ['$resource', function ($resource) {
            return {
                agreement: $resource(
                    "/agreement", null,
                    {
                        "query":    {method: "GET", isArray: false},
                        'update':   {method: 'PUT'}
                    }),
                settings: $resource(
                    "/settings", null,
                    {
                        "update": { method: 'PUT'}
                    }),
                hostname: $resource("/settings/hostname"),
                examDurations: $resource("/settings/durations"),
                gradeScale: $resource("/settings/gradescale"),
                enrolmentPermissions: $resource("/settings/enrolmentPermissionCheck"),
                environment: $resource("/settings/environment"),
                maxFilesize: $resource("/settings/maxfilesize")
            }
        }]);
}());