import * as angular from 'angular';

import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { SessionService, User } from './session/session.service';

export const AppComponent: angular.IComponentOptions = {
    template: `
        <div ng-if="!$ctrl.user && $ctrl.devLoginRequired">
            <dev-login (on-logged-in)="$ctrl.setUser($event)"></dev-login>
        </div>
        <div ng-if="$ctrl.user && (!$ctrl.user.isStudent || $ctrl.user.userAgreementAccepted)">
            <navigation ng-hide="$ctrl.hideNavBar"></navigation>
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

        constructor(private $http: angular.IHttpService,
            private $rootScope: angular.IRootScopeService,
            private $location: angular.ILocationService,
            private $sessionStorage: any,
            private Session: SessionService) {
            'ngInject';

            this.$rootScope.$on('examStarted', () => this.hideNavBar = true);
            this.$rootScope.$on('examEnded', () => this.hideNavBar = false);
            this.Session.devLogoutChange$.pipe(
                takeUntil(this.ngUnsubscribe)
            ).subscribe(() => {
                this.$location.url(this.$location.path());
                delete this.user;
            });

        }

        $onInit() {
            const user: User = this.$sessionStorage['EXAM_USER'];
            if (user) {
                if (!user.loginRole) {
                    // This happens if user refreshes the tab before having selected a login role,
                    // lets just throw him out.
                    this.Session.logout();
                }
                this.Session.setUser(user);
                this.Session.translate(user.lang);
                this.Session.restartSessionCheck();
                this.user = user;
            } else {
                this.Session.switchLanguage('en');
                this.Session.getEnv().then(
                    (value: 'DEV' | 'PROD') => {
                        if (value === 'PROD') {
                            this.Session.login('', '')
                                .then((user: User) => this.user = user)
                                .catch(angular.noop);
                        }
                        this.devLoginRequired = value === 'DEV';
                    }).catch(
                    () => console.log('no env found')
                    );
            }
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


