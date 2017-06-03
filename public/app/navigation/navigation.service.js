'use strict';

angular
    .module('app.navigation')
    .factory('Navigation', ['$resource',
        function ($resource) {
            return {
                appVersion: $resource("/app/settings/appVersion")
            }
        }
    ]);

