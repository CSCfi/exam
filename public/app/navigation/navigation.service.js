'use strict';

angular
    .module("navigation")
    .factory('Navigation', ['$resource',
        function ($resource) {
            return {
                appVersion: $resource("/app/settings/appVersion")
            }
        }
    ]);

