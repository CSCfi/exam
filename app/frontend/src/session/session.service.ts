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
import { Location, registerLocaleData } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { SESSION_STORAGE, WebStorageService } from 'angular-webstorage-service';
import { defer, from, iif, interval, Observable, of, Subject, Unsubscribable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import * as toastr from 'toastr';
import { WindowRef } from '../utility/window/window.service';
import { EulaDialogComponent } from './eula/eulaDialog.component';
import { SelectRoleDialogComponent } from './role/selectRoleDialog.component';

export interface Role {
    name: string;
    displayName: string;
    icon: string;
}

export interface User {
    id: number;
    eppn: string;
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

@Injectable()
export class SessionService {

    private PING_INTERVAL: number = 60 * 1000;
    private user: User;
    private token: string;
    private env: { isProd: boolean };
    private sessionCheckSubscription: Unsubscribable;
    private userChangeSubscription = new Subject<User>();
    private devLogoutSubscription = new Subject<void>();
    private languageChangeSubscription = new Subject<void>();

    public userChange$: Observable<User>;
    public devLogoutChange$: Observable<void>;
    public languageChange$: Observable<void>;

    constructor(private http: HttpClient,
        private i18n: TranslateService,
        @Inject('$translate') private $ajsTranslate: any,
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
        this.languageChange$ = this.languageChangeSubscription.asObservable();
    }

    getUser = () => this.user;

    getUserName = () => this.user ? this.user.firstName + ' ' + this.user.lastName : '';

    getToken = () => this.token;

    setUser(user: User) {
        this.user = user;
        this.token = user.token;
    }

    setEnv = () => this.init().subscribe(e => this.env = e);

    private init(): Observable<Env> {
        if (this.env) {
            return of(this.env);
        }
        return this.http.get<Env>('/app/settings/environment');
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

    getEnv$(): Observable<'DEV' | 'PROD'> {
        return this.init().pipe(
            tap(env => this.env = env),
            map(env => env.isProd ? 'PROD' : 'DEV'));
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
        const path = this.user.isLanguageInspector ? '/inspections' : '/';
        this.location.go(path);
    }

    logout(): void {
        if (!this.user) {
            return;
        }
        this.http.post<{ logoutUrl: string }>('/app/logout', {}).subscribe(
            resp => {
                this.webStorageService.remove('EXAM_USER');
                delete this.user;
                delete this.token;
                this.onLogoutSuccess(resp);
            },
            error => toastr.error(error.data));
    }

    getLocale = () => this.user ? this.user.lang : 'en';

    translate(lang: string) {
        this.i18n.use(lang);
        this.$ajsTranslate.use(lang); // TODO: remove once AJS is gone
        this.languageChangeSubscription.next(undefined);
    }

    switchLanguage(lang: string) {
        if (!this.user) {
            this.translate(lang);
        } else {
            this.http.put('/app/user/lang', { lang: lang })
                .subscribe(() => {
                    this.user.lang = lang;
                    this.webStorageService.set('EXAM_USER', this.user);
                    this.translate(lang);
                },
                    () => toastr.error('failed to switch language'));
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

    private openUserAgreementModal$(user: User): Observable<User> {
        const modalRef = this.modal.open(EulaDialogComponent, {
            backdrop: 'static',
            keyboard: true
        });
        return from(modalRef.result).pipe(
            tap(() => this.http.put('/app/users/agreement', {}).subscribe()),
            map(() => {
                user.userAgreementAccepted = true;
                return user;
            }),
        );
    }

    private openRoleSelectModal$(user: User): Observable<User> {
        const modalRef = this.modal.open(SelectRoleDialogComponent, {
            backdrop: 'static',
            keyboard: false
        });
        modalRef.componentInstance.user = user;
        return from(modalRef.result).pipe(
            tap(role => this.http.put(`/app/users/${user.id}/roles/${role.name}`, {}).subscribe()),
            map((role: Role) => {
                user.loginRole = role.name;
                user.isAdmin = role.name === 'ADMIN';
                user.isTeacher = role.name === 'TEACHER';
                user.isStudent = role.name === 'STUDENT';
                user.isLanguageInspector =
                    user.isTeacher && SessionService.hasPermission(user, 'CAN_INSPECT_LANGUAGE');
                return user;
            }),
        );
    }

    private prepareUser(user: User): User {
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

        Object.assign(user, {
            loginRole: loginRole,
            isTeacher: isTeacher,
            isAdmin: loginRole != null && loginRole === 'ADMIN',
            isStudent: loginRole != null && loginRole === 'STUDENT',
            isLanguageInspector: isTeacher && SessionService.hasPermission(user, 'CAN_INSPECT_LANGUAGE')
        });
        return user;
    }

    login$(username: string, password: string): Observable<User> {
        const credentials = {
            username: username,
            password: password
        };
        return this.http.post<User>('/app/login', credentials).pipe(
            map(u => this.prepareUser(u)),
            switchMap(u => this.processLogin$(u)),
            tap((u: User) => {
                this.user = u;
                this.webStorageService.set('EXAM_USER', this.user);
                this.translate(this.user.lang);
                this.restartSessionCheck();
                this.userChangeSubscription.next(u);
                const welcome = () => {
                    if (this.user) {
                        toastr.success(
                            `${this.i18n.instant('sitnet_welcome')} ${this.user.firstName} ${this.user.lastName}`
                        );
                    }
                };
                setTimeout(welcome, 2000);
                this.redirect();
            }),
            catchError(resp => {
                if (resp.error) {
                    toastr.error(this.i18n.instant(resp.error));
                }
                return throwError(resp);
            })
        );
    }

    private processLogin$(user: User): Observable<User> {
        this.token = user.token;
        const userAgreementConfirmation$ = (u: User): Observable<User> => iif(
            () => u.isStudent && !u.userAgreementAccepted,
            defer(() => this.openUserAgreementModal$(u)),
            of(u)
        );
        return user.loginRole ? userAgreementConfirmation$(user) :
            this.openRoleSelectModal$(user).pipe(
                switchMap(u => userAgreementConfirmation$(u))
            );
    }

}
