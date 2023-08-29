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
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnDestroy } from '@angular/core';
import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SESSION_STORAGE, WebStorageService } from 'ngx-webstorage-service';
import type { Observable, Unsubscribable } from 'rxjs';
import { defer, from, interval, of, Subject, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { EulaDialogComponent } from './eula/eula-dialog.component';
import { SelectRoleDialogComponent } from './role/role-picker-dialog.component';
import { SessionExpireWarningComponent } from './session-timeout-toastr';

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

@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {
    public userChange$: Observable<User | undefined>;
    public devLogoutChange$: Observable<void>;

    private PING_INTERVAL: number = 30 * 1000;
    private sessionCheckSubscription?: Unsubscribable;
    private userChangeSubscription = new Subject<User | undefined>();
    private devLogoutSubscription = new Subject<void>();
    private customSessionExpireWarning = SessionExpireWarningComponent;

    constructor(
        private http: HttpClient,
        private i18n: TranslateService,
        private router: Router,
        @Inject(SESSION_STORAGE) private webStorageService: WebStorageService,
        @Inject(DOCUMENT) private document: Document,
        private modal: NgbModal,
        private toast: ToastrService,
    ) {
        this.userChange$ = this.userChangeSubscription.asObservable();
        this.devLogoutChange$ = this.devLogoutSubscription.asObservable();
    }

    ngOnDestroy() {
        this.disableSessionCheck();
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

    getEnv$ = (): Observable<'DEV' | 'PROD'> =>
        this.http.get<Env>('/app/settings/environment').pipe(
            tap((env) => this.webStorageService.set('EXAM-ENV', env)),
            map((env) => (env.isProd ? 'PROD' : 'DEV')),
        );

    getEnv = (): Env | undefined => this.webStorageService.get('EXAM-ENV');

    logout(): void {
        this.http.delete<{ logoutUrl: string }>('/app/session', {}).subscribe({
            next: (resp) => {
                this.webStorageService.remove('EXAM_USER');
                // delete this.user;
                this.onLogoutSuccess(resp);
            },
            error: (err) => this.toast.error(err),
        });
    }

    getLocale = () => {
        const user = this.getUser();
        return user ? user.lang : 'en';
    };

    switchLanguage(lang: string) {
        const user = this.getUser();
        if (!user) {
            this.translate$(lang).subscribe();
        } else {
            this.http.put('/app/user/lang', { lang: lang }).subscribe({
                next: () => {
                    user.lang = lang;
                    this.webStorageService.set('EXAM_USER', user);
                    this.translate$(lang).subscribe();
                },
                error: () => this.toast.error('failed to switch language'),
            });
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
        this.http.get('/app/session', { responseType: 'text' }).subscribe({
            next: (resp) => {
                if (resp === 'alarm') {
                    this.toast
                        .warning(
                            this.i18n.instant('sitnet_continue_session'),
                            this.i18n.instant('sitnet_session_will_expire_soon'),
                            {
                                timeOut: 30000,
                                toastComponent: this.customSessionExpireWarning,
                                progressBar: true,
                            },
                        )
                        .onTap.subscribe(() => {
                            this.http.put<void>('/app/session', {}).subscribe({
                                next: () => {
                                    this.toast.clear();
                                    this.toast.info(this.i18n.instant('sitnet_session_extended'), '', {
                                        timeOut: 2000,
                                    });
                                },
                                error: (resp) => this.toast.error(resp),
                            });
                        });
                } else if (resp === 'no_session') {
                    this.disableSessionCheck();
                    this.toast.clear();
                    this.logout();
                }
            },
            error: (resp) => this.toast.error(resp),
        });
    };

    login$ = (username: string, password: string): Observable<User> =>
        this.http
            .post<User>('/app/session', {
                username: username,
                password: password,
            })
            .pipe(
                switchMap((u) => this.prepareUser$(u)),
                switchMap((u) => this.processLogin$(u)),
                tap((u) => {
                    this.webStorageService.set('EXAM_USER', u);
                    this.http
                        .get<{ prefix: string }>('/app/settings/coursecodeprefix')
                        .subscribe((data) => this.webStorageService.set('COURSE_CODE_PREFIX', data.prefix));
                    this.restartSessionCheck();
                    this.userChangeSubscription.next(u);
                    if (u) {
                        this.toast.success(this.i18n.instant('sitnet_welcome'), `${u.firstName} ${u.lastName}`, {
                            timeOut: 2000,
                        });
                    }
                    this.redirect(u);
                }),
                catchError((resp) => {
                    if (resp) this.toast.error(this.i18n.instant(resp));
                    this.logout();
                    return throwError(() => new Error(resp));
                }),
            );

    translate$ = (lang: string) => this.i18n.use(lang).pipe(tap(() => (this.document.documentElement.lang = lang)));

    private processLogin$(user: User): Observable<User> {
        const userAgreementConfirmation$ = (u: User): Observable<User> =>
            //    switchMap((u: User) => (u.isStudent && !u.userAgreementAccepted ? this.openUserAgreementModal$(u) : of(u)));
            defer(() => (u.isStudent && !u.userAgreementAccepted ? this.openUserAgreementModal$(u) : of(u)));
        return user.loginRole
            ? userAgreementConfirmation$(user)
            : this.openRoleSelectModal$(user).pipe(switchMap((u) => userAgreementConfirmation$(u)));
    }

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
        const modalRef = this.modal.open(SelectRoleDialogComponent);
        modalRef.componentInstance.user = user;
        return from(modalRef.result).pipe(
            switchMap((role: Role) => this.http.put<Role>(`/app/users/roles/${role.name}`, {})),
            map((role: Role) => {
                user.loginRole = role.name;
                user.isAdmin = role.name === 'ADMIN';
                user.isTeacher = role.name === 'TEACHER';
                user.isStudent = role.name === 'STUDENT';
                user.isLanguageInspector = user.isTeacher && this.hasPermission(user, 'CAN_INSPECT_LANGUAGE');
                return user;
            }),
        );
    }

    private prepareUser$(user: User): Observable<User> {
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
        return this.translate$(user.lang).pipe(
            map(() => ({
                ...user,
                loginRole: loginRole,
                isTeacher: isTeacher,
                isAdmin: loginRole != null && loginRole === 'ADMIN',
                isStudent: loginRole != null && loginRole === 'STUDENT',
                isLanguageInspector: isTeacher && this.hasPermission(user, 'CAN_INSPECT_LANGUAGE'),
            })),
        );
    }

    private onLogoutSuccess(data: { logoutUrl: string }): void {
        this.userChangeSubscription.next(undefined);

        this.toast.success(this.i18n.instant('sitnet_logout_success'));
        window.onbeforeunload = null;
        const location = window.location;
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
    }

    private redirect(user: User): void {
        if (this.router.url === '/' && user.isLanguageInspector) {
            this.router.navigate(['staff/inspections']);
        } else if (this.router.url === '/') {
            let state;
            if (user.loginRole === 'STUDENT') state = 'dashboard';
            else if (user.loginRole === 'TEACHER') state = 'staff/teacher';
            else state = 'staff/admin';
            this.router.navigate([state]);
        } /*else if (this.router.url === '/') {
            // Hackish but will have to try
            window.location.reload();
        }*/
    }

    private hasPermission(user: User, permission: string) {
        if (!user) {
            return false;
        }
        return user.permissions.some((p) => p.type === permission);
    }
}
