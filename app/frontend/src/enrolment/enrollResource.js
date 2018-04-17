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

angular.module('app.enrolment')
    .factory('EnrollRes', ['$resource', function ($resource) {
        return {
            list: $resource("/app/enroll"),
            enrolment: $resource("/app/enroll/:id", {id: "@id"}, {"remove": {method: "DELETE"}}),
            enroll: $resource("/app/enroll/:id",
                {
                    id: "@id"
                },
                {
                    "create": {method: "POST", params: {id: "@id"}}
                }),
            enrollStudent: $resource('/app/enroll/student/:eid',
                {
                    eid: '@eid'
                },
                {
                    'create': {method: 'POST', params: {eid: '@eid'}}
                }),
            unenrollStudent: $resource('/app/enroll/student/:id', {id: '@id'}, {'remove': {method: 'DELETE'}}),
            reservations: $resource('/app/machines/:id/reservations',
                {
                    id: '@id'
                },
                {
                    'get': {method: 'GET', isArray: true}
                }),
            enrolmentsByReservation: $resource('/app/enroll/reservation/:id',
                {
                    code: '@id'
                },
                {
                    'get': {method: 'GET', isArray: true, params: {code: '@code'}}
                }),
            check: $resource('/app/enroll/exam/:id',
                {
                    code: '@id'
                },
                {
                    'get': {method: 'GET', isArray: true, params: {id: '@id'}}
                }
            )
        };
    }]);

