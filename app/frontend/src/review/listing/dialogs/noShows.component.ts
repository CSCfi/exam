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
import * as angular from 'angular';

import { Exam } from '../../../exam/exam.model';
import { User } from '../../../session/session.service';

interface NoShow {
    exam: Exam;
    displayName: string | number;
    user: User;
}

export const NoShowsComponent: angular.IComponentOptions = {
    template: require('./noShows.template.html'),
    bindings: {
        dismiss: '&',
        resolve: '<',
    },
    controller: class NoShowsController implements angular.IComponentController {
        dismiss: (_: { $value: string }) => unknown;
        noShows: NoShow[];
        resolve: { exam: Exam; noShows: NoShow[] };

        constructor(private $window: angular.IWindowService, private $scope: angular.IScope) {
            'ngInject';
            // Close modal if user clicked the back button and no changes made
            this.$scope.$on('$stateChangeStart', () => {
                if (!this.$window.onbeforeunload) {
                    this.cancel();
                }
            });
        }
        //TODO: This could be combined with the aborted exams component by adding some more bindings for customization.
        $onInit = () => {
            this.noShows = this.resolve.noShows;
            this.noShows.forEach(r => (r.displayName = r.user ? `${r.user.lastName} ${r.user.firstName}` : r.exam.id));
        };

        cancel = () => this.dismiss({ $value: 'cancel' });
    },
};

angular.module('app.review').component('noShows', NoShowsComponent);
