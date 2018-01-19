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
import {SessionService, User} from './session.service';

export const SessionComponent: angular.IComponentOptions = {
    template: `
    <div ng-if="!$ctrl.user && $ctrl.devLoginRequired">
        <dev-login on-logged-in="$ctrl.setUser(user)"></dev-login>
    </div>
    <div ng-if="$ctrl.user">
        <navigation ng-hide="$ctrl.hideNavBar"></navigation>
        <div id="mainView" class="container-fluid"
             ng-class="{'vmenu-on': !$ctrl.hideNavBar && !$ctrl.user.isAdmin, 'vmenu-on-admin': $ctrl.user.isAdmin}">
            <div ng-view/>
        </div>
    </div>
    `,
    controller: class SessionController implements angular.IComponentController {

        hideNavBar: boolean;
        user: User;

        static get $inject() {
            return ['$rootScope', '$location', 'Session'];
        }

        constructor(private $rootScope: angular.IRootScopeService,
                    private $location: angular.ILocationService,
                    private Session: SessionService) {
            this.$rootScope.$on('examStarted', () => this.hideNavBar = true);
            this.$rootScope.$on('examEnded', () => this.hideNavBar = false);
            this.$rootScope.$on('devLogout', () => {
                this.$location.url(this.$location.path());
                this.user = Session.getUser();
                Session.setLoginEnv(this);
            });

        };

        $onInit() {
            this.user = this.Session.getUser();
            this.Session.setLoginEnv(this);
        };

        setUser = function (user: User) {
            this.user = user;
        };

    }
};
