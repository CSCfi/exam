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
import * as toastr from 'toastr';

import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, Subject } from 'rxjs';
import { SESSION_STORAGE, WebStorageService } from 'angular-webstorage-service';
import { interval, Unsubscribable } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { WindowRef } from '../utility/window/window.service';

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
    loginRole: { name: string } | null;
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

@Injectable()
export class SessionService {

    private PING_INTERVAL: number = 60 * 1000;
    private user: User;
    private env: { isProd: boolean };
    private sessionCheckSubscription: Unsubscribable;
    private userChangeSubscription = new Subject<User>();
    private devLogoutSubscription = new Subject<void>();

    public userChange$: Observable<User>;
    public devLogoutChange$: Observable<void>;

    constructor(private http: HttpClient,
        private i18n: TranslateService,
        private location: Location,
        @Inject(SESSION_STORAGE) private webStorageService: WebStorageService,
        private modal: NgbModal,
        private windowRef: WindowRef) {

        // TODO: Move to app.component.ts
        i18n.addLangs(['fi', 'sv', 'en']);
        i18n.setDefaultLang('en');
        i18n.setTranslation('fi', require('../assets/i18n/fi.json'));
        i18n.setTranslation('sv', require('../assets/i18n/sv.json'));
        i18n.setTranslation('en', require('../assets/i18n/en.json'));

        this.userChange$ = this.userChangeSubscription.asObservable();
        this.devLogoutChange$ = this.devLogoutSubscription.asObservable();
    }

    getUser = () => this.user;

    getUserName = () => this.user ? this.user.firstName + ' ' + this.user.lastName : '';

    setUser(user: User) {
        this.user = user;
    }

    private init(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.env) {
                this.http.get<Env>('/app/settings/environment').subscribe(
                    resp => {
                        this.env = resp;
                        resolve();
                    },
                    () => reject());
            } else {
                resolve();
            }
        });
    }

    private static hasPermission(user: User, permission: string) {
        if (!user) {
            return false;
        }
        return user.permissions.some(p => p.type === permission);
    }

    static hasRole(user: User, role: string): boolean {
        return user && user.loginRole !== null && user.loginRole.name === role;
    }

    getEnv(): Promise<'DEV' | 'PROD'> {
        return new Promise((resolve, reject) => {
            this.init()
                .then(() => resolve(this.env.isProd ? 'PROD' : 'DEV'))
                .catch(() => reject());
        });
    }

    private onLogoutSuccess(data: { logoutUrl: string }): void {
        this.userChangeSubscription.next(undefined);

        toastr.success(this.i18n.instant('sitnet_logout_success'));
        this.windowRef.nativeWindow.onbeforeunload = () => null;
        const location = this.windowRef.nativeWindow.location;
        const localLogout = `${location.protocol}//${location.host}/Shibboleth.sso/Logout`;
        if (data && data.logoutUrl) {
            location.href = `${data.logoutUrl}?return=${localLogout}`;
        } else if (!this.env || this.env.isProd) {
            // redirect to SP-logout directly
            location.href = localLogout;
        } else {
            // DEV logout
            this.location.go('/');
            this.devLogoutSubscription.next();
        }
        setTimeout(toastr.clear, 300);
    }

    private redirect(): void {
        if (this.location.path() === '/' && this.user.isLanguageInspector) {
            this.location.go('/inspections');
        }
    }

    private onLoginSuccess(): void {
        this.restartSessionCheck();
        this.userChangeSubscription.next(this.user);

        const welcome = () => {
            if (this.user) {
                toastr.success(
                    `${this.i18n.instant('sitnet_welcome')} ${this.user.firstName} ${this.user.lastName}`
                );
            }
        };

        setTimeout(welcome, 2000);

        if (!this.user.loginRole) {
            this.openRoleSelectModal(this.user);
        } else if (this.user.isStudent && !this.user.userAgreementAccepted) {
            this.openEulaModal(this.user);
        } else {
            this.redirect();
        }
    }

    private onLoginFailure(message: any): void {
        this.location.go('/');
        toastr.error(message);
    }

    private processLoggedInUser(user: User): void {
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

        const loginRole = user.roles.length === 1 ? user.roles[0] : null;
        const isTeacher = loginRole != null && loginRole.name === 'TEACHER';
        this.user = {
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
            isAdmin: loginRole != null && loginRole.name === 'ADMIN',
            isStudent: loginRole != null && loginRole.name === 'STUDENT',
            isTeacher: isTeacher,
            isLanguageInspector: isTeacher && SessionService.hasPermission(user, 'CAN_INSPECT_LANGUAGE')
        };

        this.webStorageService.set('EXAM_USER', this.user);
        this.translate(this.user.lang);
    }

    logout(): void {
        if (!this.user) {
            return;
        }
        this.http.post<{ logoutUrl: string }>('/app/logout', {}).subscribe(
            resp => {
                this.webStorageService.remove('EXAM_USER');
                delete this.user;
                this.onLogoutSuccess(resp);
            },
            error => toastr.error(error.data));
    }

    login(username: string, password: string): Promise<User> {
        const credentials = {
            username: username,
            password: password
        };
        return new Promise((resolve, reject) => {
            this.http.post<User>('/app/login', credentials)
                .subscribe(
                resp => {
                    this.processLoggedInUser(resp);
                    this.onLoginSuccess();
                    resolve(this.user);
                },
                resp => {
                    this.onLoginFailure(resp);
                    reject();
                }
                );
        });
    }

    // FIXME: no idea how
    /*
    private setLocale = async (lang: string) => {
        if (['fi', 'sv', 'en'].map(k => this.tmhDynamicLocaleCache.get(k)).every(_.isObject)) {
            // Locale cache already loaded
            this.tmhDynamicLocale.set(lang);
        } else {
            let inject = k => this.tmhDynamicLocaleCache.put(k, angular.injector(['ngLocale']).get('$locale'));

            await import('angular-i18n/angular-locale_fi');
            inject('fi');
            await import('angular-i18n/angular-locale_sv');
            inject('sv');
            await import('angular-i18n/angular-locale_en');
            inject('en');

            this.tmhDynamicLocale.set(lang);
        }
    }
    */

    translate(lang: string) {
        this.i18n.use(lang);
        // this.setLocale(lang);
    }

    switchLanguage(lang: string) {
        if (!this.user) {
            this.translate(lang);
        } else {
            this.http.put('/app/user/lang', { lang: lang })
                .subscribe(
                () => {
                    this.user.lang = lang;
                    this.translate(lang);
                },
                () => toastr.error('failed to switch language')
                );
        }
    }

    restartSessionCheck(): void {
        if (this.sessionCheckSubscription) {
            this.sessionCheckSubscription.unsubscribe();
        }
        const scheduler = interval(this.PING_INTERVAL);
        this.sessionCheckSubscription = scheduler.subscribe(this.checkSession);
    }

    private checkSession = () => {
        this.http.get('/app/checkSession', { responseType: 'text' }).subscribe(
            resp => {
                if (resp === 'alarm') {
                    toastr.warning(this.i18n.instant('sitnet_continue_session'),
                        this.i18n.instant('sitnet_session_will_expire_soon'), {
                            timeOut: 0,
                            preventDuplicates: true,
                            onclick: () => {
                                this.http.put('/app/extendSession', {}).subscribe(
                                    () => {
                                        toastr.info(this.i18n.instant('sitnet_session_extended'),
                                            '', { timeOut: 1000 });
                                    },
                                    (resp) => toastr.error(resp));
                            }
                        });
                } else if (resp === 'no_session') {
                    if (this.sessionCheckSubscription) {
                        this.sessionCheckSubscription.unsubscribe();
                    }
                    this.logout();
                }
            }, resp => toastr.error(resp));
    }

    private openEulaModal(user: User): void {
        this.modal.open({
            backdrop: 'static',
            keyboard: true,
            component: 'eulaDialog'
        }).result.then(() => {
            this.http.put('/app/users/agreement', {}).subscribe(
                () => {
                    user.userAgreementAccepted = true;
                    this.setUser(user);
                    // We need to reload controllers after accepted user agreement.
                    // FIXME: figure out how
                    // this.$route.reload();
                },
                resp => toastr.error(resp.data)
            );
        }).catch(() => this.location.go('/logout'));
    }

    private openRoleSelectModal(user: User) {
        this.modal.open({
            component: 'selectRoleDialog',
            backdrop: 'static',
            keyboard: false,
            resolve: {
                user: () => user
            }
        }).result.then((role: { name: string, icon: string, displayName: string }) => {
            this.http.put(`/app/users/${user.id}/roles/${role.name}`, {}).subscribe(() => {
                user.loginRole = role;
                user.isAdmin = role.name === 'ADMIN';
                user.isTeacher = role.name === 'TEACHER';
                user.isStudent = role.name === 'STUDENT';
                user.isLanguageInspector =
                    user.isTeacher && SessionService.hasPermission(user, 'CAN_INSPECT_LANGUAGE');
                this.setUser(user);
                this.userChangeSubscription.next(user);
                if (user.isStudent && !user.userAgreementAccepted) {
                    this.openEulaModal(user);
                } else {
                    // We need to reload controllers after role is selected.
                    // FIXME
                    // this.$route.reload();
                }
            }, resp => {
                toastr.error(resp.data);
                this.location.go('/logout');
            });
        }).catch(() => this.location.go('/logout'));
    }

}
