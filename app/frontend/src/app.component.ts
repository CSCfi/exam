/*
 * Copyright (c) 2018 Exam Consortium
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

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionService, User } from './session/session.service';

export const AppComponent: angular.IComponentOptions = {
    template: `
        <div ng-if="!$ctrl.user && $ctrl.devLoginRequired">
            <dev-login (on-logged-in)="$ctrl.setUser($event)"></dev-login>
        </div>
        <div ng-if="$ctrl.user">
            <navigation [hidden]="$ctrl.hideNavBar"></navigation>
            <div id="mainView" class="container-fluid"
                ng-class="{'vmenu-on': !$ctrl.hideNavBar && !$ctrl.user.isAdmin, 'vmenu-on-admin': $ctrl.user.isAdmin}">
                <div class="ng-view"></div>
            </div>
        </div>
        `,
    controller: class AppController implements angular.IComponentController {
        user: User;
        hideNavBar = false;
        devLoginRequired: boolean;
        private ngUnsubscribe = new Subject();

        constructor(
            private $rootScope: angular.IRootScopeService,
            private $window: angular.IWindowService,
            private Session: SessionService) {
            'ngInject';

            this.$rootScope.$on('examStarted', () => this.hideNavBar = true);
            this.$rootScope.$on('examEnded', () => this.hideNavBar = false);
            this.Session.devLogoutChange$.pipe(
                takeUntil(this.ngUnsubscribe)
            ).subscribe(() => {
                delete this.user;
            });

        }

        $onInit() {
            const storedUser: string = this.$window.sessionStorage['EXAM_USER'];
            if (storedUser) {
                const user = JSON.parse(storedUser);
                if (!user.loginRole) {
                    // This happens if user refreshes the tab before having selected a login role,
                    // lets just throw him out.
                    this.Session.logout();
                }
                this.Session.setEnv();
                this.Session.setUser(user);
                this.Session.translate(user.lang);
                this.Session.restartSessionCheck();
                this.user = user;
            } else {
                this.Session.switchLanguage('en');
            }
            this.Session.getEnv$().subscribe(
                (value: 'DEV' | 'PROD') => {
                    if (value === 'PROD') {
                        this.Session.login$('', '').subscribe(user => this.user = user);
                    }
                    this.devLoginRequired = value === 'DEV';
                }, () => console.log('no env found')
            );
        }

        $onDestroy() {
            this.ngUnsubscribe.next();
            this.ngUnsubscribe.complete();
        }

        setUser(user: any) {
            this.user = user;
        }
    }
};


