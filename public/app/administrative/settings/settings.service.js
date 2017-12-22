'use strict';
angular.module('app.administrative.settings')
    .factory('Settings', ['$resource',
        function ($resource) {
            return {
                agreement: $resource("/app/settings/agreement", {}, {'update': {method: 'PUT'}}),
                deadline: $resource("/app/settings/deadline", {}, {"update": {method: 'PUT'}}),
                reservationWindow: $resource("/app/settings/reservationWindow", {}, {"update": {method: 'PUT'}})
            };
        }
    ]);
