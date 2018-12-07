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
import * as _ from 'lodash';
import { SessionService, User } from './session.service';

export const SessionComponent: angular.IComponentOptions = {
    template: `
    <div ng-if="!$ctrl.user && $ctrl.devLoginRequired">
        <dev-login on-logged-in="$ctrl.setUser(user)"></dev-login>
    </div>
    <div ng-if="$ctrl.user && (!$ctrl.user.isStudent || $ctrl.user.userAgreementAccepted)">
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
        devLoginRequired: boolean;

        constructor(
            private $http: angular.IHttpService,
            private $rootScope: angular.IRootScopeService,
            private $location: angular.ILocationService,
            private $sessionStorage: any,
            private Session: SessionService) {
            'ngInject';

            this.$rootScope.$on('examStarted', () => this.hideNavBar = true);
            this.$rootScope.$on('examEnded', () => this.hideNavBar = false);
            this.$rootScope.$on('devLogout', () => {
                this.$location.url(this.$location.path());
                this.user = Session.getUser();
            });

        }

        $onInit() {
            const user: User = this.$sessionStorage['EXAM_USER'];
            if (user) {
                this.Session.setUser(user);
                if (!user.loginRole) {
                    // This happens if user refreshes the tab before having selected a login role,
                    // lets just throw him out.
                    this.Session.logout();
                }
                _.merge(this.$http.defaults, { headers: { common: { 'x-exam-authentication': user.token } } });
                this.Session.translate(user.lang);
                this.Session.restartSessionCheck();
                this.user = user;
            } else {
                this.Session.switchLanguage('en');
                this.Session.getEnv().then((value: 'DEV' | 'PROD') => {
                    if (value === 'PROD') {
                        this.Session.login('', '')
                            .then((user: User) => this.user = user)
                            .catch(angular.noop);
                    }
                    this.devLoginRequired = value === 'DEV';
                }).catch(angular.noop);
            }
        }

        setUser = function (user: User) {
            this.user = user;
        };

    }
};
