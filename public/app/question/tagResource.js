'use strict';
angular.module('app.question')
    .factory("TagRes", ['$resource', function ($resource) {
        return {
            tags: $resource("/app/tags")
        };
    }]);
