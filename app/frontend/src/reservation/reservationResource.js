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

angular.module('app.reservation')
    .factory('ReservationResource', ['$resource', function ($resource) {
        return {
            reservations: $resource('/app/reservations'),
            reservation: $resource('/app/reservations/:id', {id: '@id'},
                {'remove': {method: 'DELETE', params: {id: 'id'}}}
            ),
            students: $resource('/app/reservations/students'),
            teachers: $resource('/app/reservations/teachers'),
            exams: $resource('/app/reservations/exams'),
            examrooms: $resource('/app/reservations/examrooms'),
            machines: $resource('/app/machines'),
            availableMachines: $resource('/app/reservations/:id/machines', {id: '@id'}),
            machine: $resource('/app/reservations/:id/machine', {id: '@id'}, {'update': {method: 'PUT'}})
        };
    }]);
