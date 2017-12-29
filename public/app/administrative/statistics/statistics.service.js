'use strict';

angular.module('app.administrative.statistics')
    .factory('Statistics', ['$resource', function ($resource) {
        return {
            departments: $resource("/app/reports/departments"),
            exams: $resource("/app/reports/exams"),
            reservations: $resource("/app/reports/reservations"),
            responses: $resource("/app/reports/responses"),
            participations: $resource("/app/reports/participations", {}, {
                find: {
                    method: 'GET',
                    isArray: false,
                    interceptor: {
                        response: function (response) {
                            return response.data;
                        }
                    }
                }
            })
        };
    }]);
