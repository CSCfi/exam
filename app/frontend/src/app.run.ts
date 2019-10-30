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
import { StateService } from '@uirouter/core';
import * as angular from 'angular';

export default function run($state: StateService, $location: any, $rootScope: angular.IRootScopeService) {
    'ngInject';

    // Add location reload flag to original $location service.
    // TODO: maybe try this with $state.go?
    const original = $location.path;
    $location.path = (path: string, reload: boolean) => {
        if (reload === false) {
            const lastRoute = $state.current;
            const undo = $rootScope.$on('$locationChangeSuccess', () => {
                $state.current = lastRoute;
                undo();
            });
        }
        return original.apply($location, [path]);
    };
}
