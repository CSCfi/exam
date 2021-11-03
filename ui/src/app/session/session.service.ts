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
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { StateService, UIRouterGlobals } from '@uirouter/core';
import { SESSION_STORAGE, WebStorageService } from 'ngx-webstorage-service';
import { defer, from, interval, of, Subject, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import * as toastr from 'toastr';

import { WindowRef } from '../utility/window/window.service';
import { EulaDialogComponent } from './eula/eulaDialog.component';
import { SelectRoleDialogComponent } from './role/selectRoleDialog.component';

import type { OnDestroy } from '@angular/core';
import type { Observable, Unsubscribable } from 'rxjs';
export interface Role {
    name: string;
    displayName?: string;
    icon?: string;
}

export interface User {
    id: number;
    eppn: string;
    firstName: string;
    lastName: string;
    name?: string;
    email: string;
    lang: string;
    loginRole: string | null;
    roles: Role[];
    userAgreementAccepted: boolean;
    userIdentifier: string;
    permissions: { type: string }[];
    isAdmin: boolean;
    isStudent: boolean;
    isTeacher: boolean;
    isLanguageInspector: boolean;
    employeeNumber: string | null;
    lastLogin: string | null;
}

interface Env {
    isProd: boolean;
}

@Injectable()
export class SessionService implements OnDestroy {
    private PING_INTERVAL: number = 30 * 1000;
    private sessionCheckSubscription?: Unsubscribable;
    private userChangeSubscription = new Subject<User>();
    private devLogoutSubscription = new Subject<void>();

    public userChange$: Observable<User>;
    public devLogoutChange$: Observable<void>;

    constructor(
        private http: HttpClient,
        private i18n: TranslateService,
        private state: StateService,
        private routing: UIRouterGlobals,
        @Inject(SESSION_STORAGE) private webStorageService: WebStorageService,
        private modal: NgbModal,
        private windowRef: WindowRef,
    ) {
        this.userChange$ = this.userChangeSubscription.asObservable();
        this.devLogoutChange$ = this.devLogoutSubscription.asObservable();
    }

    ngOnDestroy() {
        if (this.sessionCheckSubscription) this.sessionCheckSubscription.unsubscribe();
    }

    getUser = (): User => {
        const user = this.webStorageService.get('EXAM_USER');
        if (!user) console.log('Tried to fetch a logged-out user.');
        return user;
    };

    getUserName = () => {
        const user = this.getUser();
        return user ? user.firstName + ' ' + user.lastName : '';
    };

    private static hasPermission(user: User, permission: string) {
        if (!user) {
            return false;
        }
        return user.permissions.some((p) => p.type === permission);
    }

    static hasRole(user: User, role: string): boolean {
        return user && user.loginRole !== null && user.loginRole === role;
    }

    getEnv$ = (): Observable<'DEV' | 'PROD'> =>
        this.http.get<Env>('/app/settings/environment').pipe(
            tap((env) => this.webStorageService.set('EXAM-ENV', env)),
            map((env) => (env.isProd ? 'PROD' : 'DEV')),
        );

    getEnv = (): Env | undefined => this.webStorageService.get('EXAM-ENV');

    private onLogoutSuccess(data: { logoutUrl: string }): void {
        this.userChangeSubscription.next(undefined);

        toastr.success(this.i18n.instant('sitnet_logout_success'));
        this.windowRef.nativeWindow.onbeforeunload = () => null;
        const location = this.windowRef.nativeWindow.location;
        const localLogout = `${location.protocol}//${location.host}/Shibboleth.sso/Logout`;
        const env = this.getEnv();
        if (data && data.logoutUrl) {
            location.href = `${localLogout}?return=${data.logoutUrl}`;
        } else if (!env || env.isProd) {
            // redirect to SP-logout directly
            location.href = localLogout;
        } else {
            // DEV logout
            this.devLogoutSubscription.next();
        }
        this.windowRef.nativeWindow.setTimeout(toastr.clear, 300);
    }

    private redirect(user: User): void {
        if (this.routing.current.name === 'app' && user.isLanguageInspector) {
            this.state.go('staff.languageInspections');
        } else if (this.routing.current.name === 'app') {
            let state;
            if (user.loginRole === 'STUDENT') state = 'dashboard';
            else if (user.loginRole === 'TEACHER') state = 'staff.teacher';
            else state = 'staff.admin';
            this.state.go(state);
        }
    }

    logout(): void {
        this.http.post<{ logoutUrl: string }>('/app/logout', {}).subscribe((resp) => {
            this.webStorageService.remove('EXAM_USER');
            // delete this.user;
            this.onLogoutSuccess(resp);
        }, toastr.error);
    }

    getLocale = () => {
        const user = this.getUser();
        return user ? user.lang : 'en';
    };

    translate(lang: string) {
        this.i18n.use(lang);
    }

    switchLanguage(lang: string) {
        const user = this.getUser();
        if (!user) {
            this.translate(lang);
        } else {
            this.http.put('/app/user/lang', { lang: lang }).subscribe(
                () => {
                    user.lang = lang;
                    this.webStorageService.set('EXAM_USER', user);
                    this.translate(lang);
                },
                () => toastr.error('failed to switch language'),
            );
        }
    }

    restartSessionCheck(): void {
        this.disableSessionCheck();
        const scheduler = interval(this.PING_INTERVAL);
        this.sessionCheckSubscription = scheduler.subscribe(this.checkSession);
    }

    disableSessionCheck(): void {
        if (this.sessionCheckSubscription) {
            this.sessionCheckSubscription.unsubscribe();
        }
    }

    checkSession = () => {
        this.http.get('/app/checkSession', { responseType: 'text' }).subscribe(
            (resp) => {
                if (resp === 'alarm') {
                    toastr.warning(
                        this.i18n.instant('sitnet_continue_session'),
                        this.i18n.instant('sitnet_session_will_expire_soon'),
                        {
                            timeOut: 0,
                            preventDuplicates: true,
                            onclick: () => {
                                this.http.put('/app/extendSession', {}).subscribe(
                                    () => {
                                        toastr.info(this.i18n.instant('sitnet_session_extended'), '', {
                                            timeOut: 1000,
                                        });
                                    },
                                    (resp) => toastr.error(resp),
                                );
                            },
                        },
                    );
                } else if (resp === 'no_session') {
                    if (this.sessionCheckSubscription) {
                        this.sessionCheckSubscription.unsubscribe();
                    }
                    this.logout();
                }
            },
            (resp) => toastr.error(resp),
        );
    };

    private openUserAgreementModal$(user: User): Observable<User> {
        const modalRef = this.modal.open(EulaDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        return from(modalRef.result).pipe(
            switchMap(() => this.http.put('/app/users/agreement', {})),
            map(() => ({ ...user, userAgreementAccepted: true })),
        );
    }

    private openRoleSelectModal$(user: User): Observable<User> {
        const modalRef = this.modal.open(SelectRoleDialogComponent, {
            backdrop: 'static',
            keyboard: false,
        });
        modalRef.componentInstance.user = user;
        return from(modalRef.result).pipe(
            switchMap((role: Role) => this.http.put<Role>(`/app/users/roles/${role.name}`, {})),
            map((role: Role) => {
                user.loginRole = role.name;
                user.isAdmin = role.name === 'ADMIN';
                user.isTeacher = role.name === 'TEACHER';
                user.isStudent = role.name === 'STUDENT';
                user.isLanguageInspector = user.isTeacher && SessionService.hasPermission(user, 'CAN_INSPECT_LANGUAGE');
                return user;
            }),
        );
    }

    private prepareUser(user: User): User {
        user.roles.forEach((role) => {
            switch (role.name) {
                case 'ADMIN':
                    role.displayName = 'sitnet_admin';
                    role.icon = 'bi-gear';
                    break;
                case 'TEACHER':
                    role.displayName = 'sitnet_teacher';
                    role.icon = 'bi-person-fill';
                    break;
                case 'STUDENT':
                    role.displayName = 'sitnet_student';
                    role.icon = 'bi-person';
                    break;
            }
        });

        const loginRole = user.roles.length === 1 ? user.roles[0].name : null;
        const isTeacher = loginRole != null && loginRole === 'TEACHER';
        this.translate(user.lang);

        return {
            ...user,
            loginRole: loginRole,
            isTeacher: isTeacher,
            isAdmin: loginRole != null && loginRole === 'ADMIN',
            isStudent: loginRole != null && loginRole === 'STUDENT',
            isLanguageInspector: isTeacher && SessionService.hasPermission(user, 'CAN_INSPECT_LANGUAGE'),
        };
    }

    login$ = (username: string, password: string): Observable<User> =>
        this.http
            .post<User>('/app/login', {
                username: username,
                password: password,
            })
            .pipe(
                map((u) => this.prepareUser(u)),
                switchMap((u) => this.processLogin$(u)),
                tap((u) => {
                    this.webStorageService.set('EXAM_USER', u);
                    this.restartSessionCheck();
                    this.userChangeSubscription.next(u);
                    const welcome = () => {
                        if (u) {
                            toastr.success(`${this.i18n.instant('sitnet_welcome')} ${u.firstName} ${u.lastName}`);
                        }
                    };
                    this.windowRef.nativeWindow.setTimeout(welcome, 2000);
                    this.redirect(u);
                }),
                catchError((resp) => {
                    if (resp) toastr.error(this.i18n.instant(resp));
                    this.logout();
                    return throwError(resp);
                }),
            );

    private processLogin$(user: User): Observable<User> {
        const userAgreementConfirmation$ = (u: User): Observable<User> =>
            //    switchMap((u: User) => (u.isStudent && !u.userAgreementAccepted ? this.openUserAgreementModal$(u) : of(u)));
            defer(() => (u.isStudent && !u.userAgreementAccepted ? this.openUserAgreementModal$(u) : of(u)));
        return user.loginRole
            ? userAgreementConfirmation$(user)
            : this.openRoleSelectModal$(user).pipe(switchMap((u) => userAgreementConfirmation$(u)));
    }
}
