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

angular.module('app.administrative.users').factory('UserManagement', [
    '$resource',
    function($resource) {
        return {
            users: $resource('/app/users'),
            permissions: $resource(
                '/app/permissions',
                {},
                {
                    add: { method: 'POST' },
                    remove: { method: 'DELETE' },
                },
            ),
            roles: $resource(
                '/app/users/:id/roles/:role',
                {
                    id: '@id',
                    role: '@role',
                },
                {
                    add: { method: 'POST', params: { id: '@id', role: '@role' } },
                    update: { method: 'PUT', params: { id: '@id', role: '@role' } },
                    remove: { method: 'DELETE', params: { id: '@id', role: '@role' } },
                },
            ),
        };
    },
]);
