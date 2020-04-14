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

angular.module('app.software').factory('SoftwareRes', [
    '$resource',
    function($resource) {
        return {
            machines: $resource(
                '/app/software_machine/:mid',
                {
                    mid: '@mid',
                },
                {
                    reset: { method: 'PUT' },
                },
            ),

            machine: $resource(
                '/app/machine/:mid/software/:sid',
                {
                    mid: '@mid',
                    sid: '@sid',
                },
                {
                    add: { method: 'PUT' },
                    toggle: { method: 'POST' },
                },
            ),

            softwares: $resource(
                '/app/softwares',
                {},
                {
                    query: { method: 'GET', isArray: true },
                },
            ),

            software: $resource(
                '/app/softwares/:id',
                {
                    id: '@id',
                },
                {
                    query: { method: 'GET' },
                    remove: { method: 'DELETE' },
                },
            ),

            add: $resource(
                '/app/softwares/add/:name',
                {
                    name: '@name',
                },
                {
                    insert: { method: 'POST' },
                },
            ),

            update: $resource(
                '/app/softwares/update/:id/:name',
                {
                    id: '@id',
                    name: '@name',
                },
                {
                    update: { method: 'PUT' },
                },
            ),
        };
    },
]);
