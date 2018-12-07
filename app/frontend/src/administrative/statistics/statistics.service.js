/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import angular from 'angular';

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
