'use strict';
angular.module("exam.services")
    .factory("SettingsResource", ['$resource',
        function ($resource) {
            return {
                hostname: $resource("/app/settings/hostname"),
                examDurations: $resource("/app/settings/durations"),
                gradeScale: $resource("/app/settings/gradescale"),
                enrolmentPermissions: $resource("/app/settings/enrolmentPermissionCheck"),
                environment: $resource("/app/settings/environment"),
                iop: $resource("/app/settings/iop"),
                maxFilesize: $resource("/app/settings/maxfilesize"),
                appVersion: $resource("/app/settings/appVersion"),
                maturityInstructions: $resource("/app/settings/maturityInstructions")
            };
        }
    ]);
