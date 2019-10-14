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
import { IDeferred, IHttpResponse, IPromise } from 'angular';
import * as toastr from 'toastr';
import * as uib from 'angular-ui-bootstrap';
import * as _ from 'lodash';
import * as adl from 'angular-dynamic-locale';

export interface Role {
    name: string;
    displayName: string;
    icon: string;
}

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    lang: string;
    loginRole: string | null;
    roles: Role[];
    token: string;
    userAgreementAccepted: boolean;
    userIdentifier: string;
    permissions: { type: string }[];
    isAdmin: boolean;
    isStudent: boolean;
    isTeacher: boolean;
    isLanguageInspector: boolean;
}

interface Env {
    isProd: boolean;
}

export class SessionService {

    PING_INTERVAL: number = 60 * 1000;
    _user: User;
    _env: { isProd: boolean };
    _scheduler: IPromise<any>;

    constructor(private $http: angular.IHttpService,
        private $route: angular.route.IRouteService,
        private $q: angular.IQService,
        private $interval: angular.IIntervalService,
        private $sessionStorage: any, // no usable typedef available
        private $translate: angular.translate.ITranslateService,
        private $location: angular.ILocationService,
        private $rootScope: angular.IRootScopeService,
        private $timeout: angular.ITimeoutService,
        private $uibModal: uib.IModalService,
        private $window: angular.IWindowService,
        private tmhDynamicLocaleCache: { get: (k: string) => any; put: (k: string, v: any) => void },
        private tmhDynamicLocale: adl.tmh.IDynamicLocale) {
        'ngInject';
    }


    getUser(): User {
        return this._user;
    }

    getUserName(): string {
        return this._user ? this._user.firstName + ' ' + this._user.lastName : '';
    }

    setUser(user: User): void {
        this._user = user;
    }

    private init(): angular.IPromise<Env> {
        const deferred: IDeferred<Env> = this.$q.defer();
        if (!this._env) {
            this.$http.get('/app/settings/environment').then((resp: IHttpResponse<Env>) => {
                this._env = resp.data;
                deferred.resolve();
            }).catch(angular.noop);
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    }

    private static hasPermission(user: User, permission: string) {
        if (!user) {
            return false;
        }
        return user.permissions.some(p => p.type === permission);
    }

    static hasRole(user: User, role: string): boolean {
        return user && user.loginRole !== null && user.loginRole === role;
    }

    getEnv(): IPromise<'DEV' | 'PROD'> {
        const deferred: IDeferred<'DEV' | 'PROD'> = this.$q.defer();
        this.init()
            .then(() => deferred.resolve(this._env.isProd ? 'PROD' : 'DEV'))
            .catch(() => deferred.reject());
        return deferred.promise;
    }

    private onLogoutSuccess(data: { logoutUrl: string }): void {
        this.$rootScope.$broadcast('userUpdated');
        toastr.success(this.$translate.instant('sitnet_logout_success'));
        this.$window.onbeforeunload = () => null;
        const localLogout = `${this.$window.location.protocol}//${this.$window.location.host}/Shibboleth.sso/Logout`;
        if (data && data.logoutUrl) {
            this.$window.location.href = `${localLogout}?return=${data.logoutUrl}`;
        } else if (!this._env || this._env.isProd) {
            // redirect to SP-logout directly
            this.$window.location.href = localLogout;
        } else {
            // DEV logout
            this.$location.path('/');
            this.$rootScope.$broadcast('devLogout');
        }
        this.$timeout(toastr.clear, 300);
    }

    private redirect(): void {
        if (this.$location.path() === '/' && this._user.isLanguageInspector) {
            this.$location.path('/inspections');
        }
    }

    private onLoginSuccess(): void {
        this.restartSessionCheck();
        this.$rootScope.$broadcast('userUpdated');

        const welcome = () => {
            if (this._user) {
                toastr.success(
                    `${this.$translate.instant('sitnet_welcome')} ${this._user.firstName} ${this._user.lastName}`
                );
            }
        };

        this.$timeout(welcome, 2000);

        if (!this._user.loginRole) {
            this.openRoleSelectModal(this._user);
        } else if (this._user.isStudent && !this._user.userAgreementAccepted) {
            this.openEulaModal(this._user);
        } else {
            this.redirect();
        }
    }

    private onLoginFailure(message: any): void {
        this.$location.path('/');
        toastr.error(message);
    }

    private processLoggedInUser(user: User): void {
        _.merge(this.$http.defaults, { headers: { common: { 'x-exam-authentication': user.token } } });
        user.roles.forEach(role => {
            switch (role.name) {
                case 'ADMIN':
                    role.displayName = 'sitnet_admin';
                    role.icon = 'fa-cog';
                    break;
                case 'TEACHER':
                    role.displayName = 'sitnet_teacher';
                    role.icon = 'fa-university';
                    break;
                case 'STUDENT':
                    role.displayName = 'sitnet_student';
                    role.icon = 'fa-graduation-cap';
                    break;
            }
        });

        const loginRole = user.roles.length === 1 ? user.roles[0].name : null;
        const isTeacher = loginRole != null && loginRole === 'TEACHER';
        this._user = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            lang: user.lang,
            loginRole: loginRole,
            roles: user.roles,
            token: user.token,
            userAgreementAccepted: user.userAgreementAccepted,
            userIdentifier: user.userIdentifier,
            permissions: user.permissions,
            isAdmin: loginRole != null && loginRole === 'ADMIN',
            isStudent: loginRole != null && loginRole === 'STUDENT',
            isTeacher: isTeacher,
            isLanguageInspector: isTeacher && SessionService.hasPermission(user, 'CAN_INSPECT_LANGUAGE')
        };

        this.$sessionStorage['EXAM_USER'] = this._user;
        this.translate(this._user.lang);
    }

    logout(): void {
        if (!this._user) {
            return;
        }
        this.$http.post('/app/logout', {}).then((resp: IHttpResponse<{ logoutUrl: string }>) => {
            delete this.$sessionStorage['EXAM_USER'];
            if (this.$http.defaults.headers) {
                delete this.$http.defaults.headers.common;
            }
            delete this._user;
            this.onLogoutSuccess(resp.data);
        }).catch(error => toastr.error(error.data));
    }

    login(username: string, password: string): IPromise<User> {
        const credentials = {
            username: username,
            password: password
        };
        const deferred: IDeferred<User> = this.$q.defer();
        this.$http.post('/app/login', credentials)
            .then((resp: IHttpResponse<User>) => {
                this.processLoggedInUser(resp.data);
                this.onLoginSuccess();
                deferred.resolve(this._user);
            })
            .catch((resp) => {
                this.onLoginFailure(resp.data);
                deferred.reject();
            });
        return deferred.promise;
    }

    private setLocale = async (lang: string) => {
        if (['fi', 'sv', 'en'].map(k => this.tmhDynamicLocaleCache.get(k)).every(_.isObject)) {
            // Locale cache already loaded
            this.tmhDynamicLocale.set(lang);
        } else {
            const inject = k => this.tmhDynamicLocaleCache.put(k, angular.injector(['ngLocale']).get('$locale'));

            await import('angular-i18n/angular-locale_fi');
            inject('fi');
            await import('angular-i18n/angular-locale_sv');
            inject('sv');
            await import('angular-i18n/angular-locale_en');
            inject('en');

            this.tmhDynamicLocale.set(lang);
        }
    }

    translate(lang: string) {
        this.$translate.use(lang);
        this.setLocale(lang);
    }

    switchLanguage(lang: string) {
        if (!this._user) {
            this.translate(lang);
        } else {
            this.$http.put('/app/user/lang', { lang: lang })
                .then(() => {
                    this._user.lang = lang;
                    this.translate(lang);
                })
                .catch(() =>
                    toastr.error('failed to switch language')
                );
        }
    }

    restartSessionCheck(): void {
        if (this._scheduler) {
            this.$interval.cancel(this._scheduler);
        }
        this._scheduler = this.$interval(this.checkSession, this.PING_INTERVAL);
    }

    private checkSession = () => {
        this.$http.get('/app/checkSession')
            .then((resp) => {
                if (resp.data === 'alarm') {
                    toastr.warning(this.$translate.instant('sitnet_continue_session'),
                        this.$translate.instant('sitnet_session_will_expire_soon'), {
                        timeOut: 0,
                        preventDuplicates: true,
                        onclick: () => {
                            this.$http.put('/app/extendSession', {})
                                .then(() => {
                                    toastr.info(this.$translate.instant('sitnet_session_extended'),
                                        '', { timeOut: 1000 });
                                })
                                .catch(angular.noop);
                        }
                    });
                } else if (resp.data === 'no_session') {
                    if (this._scheduler) {
                        this.$interval.cancel(this._scheduler);
                    }
                    this.logout();
                }
            })
            .catch(angular.noop);
    }

    private openEulaModal(user: User): void {
        this.$uibModal.open({
            backdrop: 'static',
            keyboard: true,
            component: 'eulaDialog'
        }).result.then(() => {
            this.$http.put('/app/users/agreement', {}).then(() => {
                user.userAgreementAccepted = true;
                this.setUser(user);
                // We need to reload controllers after accepted user agreement.
                this.$route.reload();
            }).catch((resp) => {
                toastr.error(resp.data);
            });
        }).catch(() => this.$location.path('/logout'));
    }

    private openRoleSelectModal(user: User) {
        this.$uibModal.open({
            component: 'selectRoleDialog',
            backdrop: 'static',
            keyboard: false,
            resolve: {
                user: () => user
            }
        }).result.then((role: { name: string; icon: string; displayName: string }) => {
            this.$http.put(`/app/users/${user.id}/roles/${role.name}`, {}).then(() => {
                user.loginRole = role.name;
                user.isAdmin = role.name === 'ADMIN';
                user.isTeacher = role.name === 'TEACHER';
                user.isStudent = role.name === 'STUDENT';
                user.isLanguageInspector =
                    user.isTeacher && SessionService.hasPermission(user, 'CAN_INSPECT_LANGUAGE');
                this.setUser(user);
                this.$rootScope.$broadcast('userUpdated');
                if (user.isStudent && !user.userAgreementAccepted) {
                    this.openEulaModal(user);
                } else {
                    // We need to reload controllers after role is selected.
                    this.$route.reload();
                }
            }).catch((resp) => {
                toastr.error(resp.data);
                this.$location.path('/logout');
            });
        }).catch(() => this.$location.path('/logout'));
    }

}
