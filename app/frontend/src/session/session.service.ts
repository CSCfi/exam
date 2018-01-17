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
import {IDeferred, IHttpResponse, IPromise} from 'angular';
import * as toastr from 'toastr';
import {ngStorage} from 'ngstorage';
import * as uib from 'angular-ui-bootstrap';

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    lang: object;
    loginRole: { name: string };
    roles: { name: string, displayName: string, icon: string }[];
    token: string;
    userAgreementAccepted: boolean;
    userIdentifier: string;
    permissions: { type: string }[];
    isAdmin: boolean;
    isStudent: boolean;
    isTeacher: boolean;
    isLanguageInspector: boolean;

}

export interface LogoutUrl {
    logoutUrl: string
}

export class SessionService {

    PING_INTERVAL: number = 60 * 1000;
    _user: User;
    _env: { isProd: boolean };
    _scheduler: IPromise<any>;

    constructor(private $http: angular.IHttpService,
                private $q: angular.IQService,
                private $interval: angular.IIntervalService,
                private $sessionStorage: ngStorage.StorageService,
                private $translate: angular.translate.ITranslateService,
                private $location: angular.ILocationService,
                private $rootScope: angular.IRootScopeService,
                private $timeout: angular.ITimeoutService,
                private $modal: uib.IModalService,
                private $route: angular.route.IRouteService) {

    }


    getUser(): object {
        return this._user;
    }

    getUserName(): string {
        if (this._user) {
            return this._user.firstName + ' ' + this._user.lastName;
        }
    };

    setUser(user: User): void {
        this._user = user;
    };

    private _init(): angular.IPromise<any> {
        const deferred: IDeferred<any> = this.$q.defer();
        if (!this._env) {
            this.$http.get('/app/settings/environment').then((resp: any) => {
                this._env = {isProd: resp.data.isProd};
                deferred.resolve();
            }).catch(angular.noop);
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    };

    private static _hasPermission(user: User, permission: string) {
        if (!user) {
            return false;
        }
        return user.permissions.some(p => p.type === permission);
    };

    static hasRole(user: User, role: string): boolean {
        return user && user.loginRole && user.loginRole.name === role;
    }

    setLoginEnv(scope: any): void {
        this._init().then(() => {
            if (!this._env.isProd) {
                scope.devLoginRequired = true;
            }
        }).catch(angular.noop);
    };

    private _onLogoutSuccess(data: { logoutUrl: string }): void {
        this.$rootScope.$broadcast('userUpdated');
        toastr.success(this.$translate.instant('sitnet_logout_success'));
        window.onbeforeunload = null;
        const localLogout: string = window.location.protocol + '//' + window.location.host + '/Shibboleth.sso/Logout';
        if (data && data.logoutUrl) {
            window.location.href = data.logoutUrl + '?return=' + localLogout;
        } else if (!this._env || this._env.isProd) {
            // redirect to SP-logout directly
            window.location.href = localLogout;
        } else {
            // DEV logout
            this.$location.path('/');
            this.$rootScope.$broadcast('devLogout');
        }
        this.$timeout(toastr.clear, 300);
    };

    private _redirect(): void {
        if (this.$location.path() === '/' && this._user.isLanguageInspector) {
            this.$location.path('/inspections');
        } else if (this._env && !this._env.isProd) {
            this.$location.path(this._user.isLanguageInspector ? '/inspections' : '/');
        }
    };

    private _onLoginSuccess(): void {
        this.restartSessionCheck();
        this.$rootScope.$broadcast('userUpdated');

        const welcome = () =>
            toastr.success(`${this.$translate.instant('sitnet_welcome')} ${this._user.firstName} ${this._user.lastName}`);

        this.$timeout(welcome, 2000);

        if (!this._user.loginRole) {
            this._openRoleSelectModal(this._user);
        } else if (this._user.isStudent && !this._user.userAgreementAccepted) {
            this._openEulaModal(this._user);
        } else {
            this._redirect();
            //this.$route.reload();
        }
    };

    private _onLoginFailure(message: any) {
        this.$location.path('/');
        toastr.error(message);
    };

    private _processLoggedInUser(user: User) {
        this.$http.defaults.headers.common = {'x-exam-authentication': user.token};
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

        const loginRole = user.roles.length === 1 ? user.roles[0] : undefined;
        const isTeacher = loginRole && loginRole.name === 'TEACHER';
        this._user = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            lang: user.lang,
            loginRole: loginRole,
            roles: user.roles,
            token: user.token,
            userAgreementAccepted: user.userAgreementAccepted,
            userIdentifier: user.userIdentifier,
            permissions: user.permissions,
            isAdmin: loginRole && loginRole.name === 'ADMIN',
            isStudent: loginRole && loginRole.name === 'STUDENT',
            isTeacher: isTeacher,
            isLanguageInspector: isTeacher && SessionService._hasPermission(user, 'CAN_INSPECT_LANGUAGE')
        };

        this.$sessionStorage['EXAM_USER'] = this._user;
        this.translate(this._user.lang);
    };

    logout(): void {
        if (!this._user) {
            return;
        }
        this.$http.post('/app/logout', {}).then((resp: IHttpResponse<{logoutUrl: string}>) => {
            delete this.$sessionStorage['EXAM_USER'];
            delete this.$http.defaults.headers.common;
            delete this._user;
            this._onLogoutSuccess(resp.data);
        }).catch(function (error) {
            toastr.error(error.data);
        });
    };

    login(username: string, password: string): IPromise<User> {
        const credentials = {
            username: username,
            password: password
        };
        const deferred: IDeferred<User> = this.$q.defer();
        this.$http.post('/app/login', credentials)  //, {ignoreAuthModule: true} ??
            .then((resp: IHttpResponse<User>) => {
                this._processLoggedInUser(resp.data);
                this._onLoginSuccess();
                deferred.resolve(this._user);
            })
            .catch((resp) => {
                this._onLoginFailure(resp.data);
                deferred.reject();
            });
        return deferred.promise;
    };

    translate(lang) {
        this.$translate.use(lang);
        this.$rootScope.$broadcast('$localeChangeSuccess');
    };

    switchLanguage(lang: string) {
        if (!this._user) {
            this.translate(lang);
        } else {
            this.$http.put('/app/user/lang', {lang: lang})
                .then(function () {
                    this._user.lang = lang;
                    this.translate(lang);
                })
                .catch(function () {
                    toastr.error('failed to switch language');
                });
        }
    };

    restartSessionCheck(): void {
        if (this._scheduler) {
            this.$interval.cancel(this._scheduler);
        }
        this._scheduler = this.$interval(() => this._checkSession, this.PING_INTERVAL);
    };

    private _checkSession() {
        this.$http.get('/app/checkSession')
            .then(function (resp) {
                if (resp.data === 'alarm') {
                    toastr.warning(this.$translate.instant('sitnet_continue_session'),
                        this.$translate.instant('sitnet_session_will_expire_soon'), {
                            timeOut: 0,
                            preventDuplicates: true,
                            onclick: function () {
                                this.$http.put('/app/extendSession', {})
                                    .then(function () {
                                        toastr.info(this.$translate.instant('sitnet_session_extended'), null, {timeOut: 1000});
                                    }).catch(angular.noop);
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
    };


    private _openEulaModal(user: User): void {
        this.$modal.open({
            backdrop: 'static',
            keyboard: true,
            component: 'eulaDialog'
        }).result.then(function () {
            this.$http.put("/app/users/agreement").then(function () {
                user.userAgreementAccepted = true;
                this.setUser(user);
                if (this.$location.url() === '/login' || this.$location.url() === '/logout') {
                    this.$location.path('/');
                } else {
                    this.$route.reload();
                }
            }).catch(function (resp) {
                toastr.error(resp.data);
            });
        }).catch(function () {
            this.$location.path('/logout');
        });
    };

    private _openRoleSelectModal(user: User) {
        this.$modal.open({
            component: 'selectRoleDialog',
            backdrop: 'static',
            keyboard: false,
            resolve: {
                user: function () {
                    return user;
                }
            }
        }).result.then(function (role: { name: string, icon: string, displayName: string }) {
            this.$http.put(`/app/users/${user.id}/roles/${role.name}`).then(function () {
                user.loginRole = role;
                user.isAdmin = role.name === 'ADMIN';
                user.isTeacher = role.name === 'TEACHER';
                user.isStudent = role.name === 'STUDENT';
                user.isLanguageInspector = user.isTeacher && this._hasPermission(user, 'CAN_INSPECT_LANGUAGE');
                this.setUser(user);
                this.$rootScope.$broadcast('userUpdated');
                if (user.isStudent && !user.userAgreementAccepted) {
                    this._openEulaModal(user);
                } else if (this.$location.url() === '/login' || this.$location.url() === '/logout') {
                    this.$location.path('/');
                } else {
                    this.$route.reload();
                }
            }).catch(function (resp) {
                toastr.error(resp.data);
                this.$location.path('/logout');
            });
        }).catch(function () {
            this.$location.path('/logout');
        });
    };

    static get $inject() {
        return ['$http', '$q', '$interval', '$sessionStorage', '$translate', '$location',
            '$rootScope', '$timeout', '$uibModal', '$route'];

    }

}
