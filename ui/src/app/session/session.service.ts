// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import type { OnDestroy } from '@angular/core';
import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable, Unsubscribable } from 'rxjs';
import { EMPTY, defer, interval, of, throwError } from 'rxjs';
import { catchError, delay, map, switchMap, tap } from 'rxjs/operators';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { StorageService } from 'src/app/shared/storage/storage.service';
import { EulaDialogComponent } from './eula/eula-dialog.component';
import { ExternalLoginConfirmationDialogComponent } from './eula/external-login-confirmation-dialog.component';
import { SelectRoleDialogComponent } from './role/role-picker-dialog.component';
import { SessionExpireWarningComponent } from './session-timeout-toastr';
import { Role, User } from './session.model';

interface Env {
    isProd: boolean;
}

@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {
    private http = inject(HttpClient);
    private i18n = inject(TranslateService);
    private router = inject(Router);
    private Storage = inject(StorageService);
    private document = inject<Document>(DOCUMENT);
    private modal = inject(ModalService);
    private toast = inject(ToastrService);

    private PING_INTERVAL: number = 30 * 1000;
    private sessionCheckSubscription?: Unsubscribable;
    private toastTapSubscription?: Unsubscribable;

    private userChange = signal<User | undefined>(undefined);
    private devLogoutChange = signal<number | undefined>(undefined);

    constructor() {
        this.userChange.set(this.getOptionalUser());
    }

    get userChangeSignal() {
        return this.userChange.asReadonly();
    }
    get devLogoutChangeSignal() {
        return this.devLogoutChange.asReadonly();
    }

    ngOnDestroy() {
        this.disableSessionCheck();
    }

    getUser = (): User => {
        if (this.Storage.has('EXAM_USER')) {
            return this.Storage.get<User>('EXAM_USER') as User;
        }
        throw new Error('EXAM_USER not found');
    };

    getOptionalUser = (): User | undefined => this.Storage.get<User>('EXAM_USER');

    getUserName = () => {
        const user = this.getOptionalUser();
        return user ? user.firstName + ' ' + user.lastName : '';
    };

    getEnv$ = (): Observable<'DEV' | 'PROD'> =>
        this.http.get<Env>('/app/settings/environment').pipe(
            tap((env) => this.Storage.set('EXAM-ENV', env)),
            map((env) => (env.isProd ? 'PROD' : 'DEV')),
        );

    getEnv = (): Env | undefined => this.Storage.get<Env>('EXAM-ENV');

    logout(): void {
        this.http.delete<{ logoutUrl: string }>('/app/session', {}).subscribe({
            next: (resp) => {
                this.Storage.remove('EXAM_USER');
                this.userChange.set(undefined);
                this.onLogoutSuccess(resp);
            },
            error: (err) => this.toast.error(err),
        });
    }

    getLocale = () => {
        const user = this.getOptionalUser();
        return user ? user.lang : 'en';
    };

    switchLanguage(lang: string) {
        const user = this.getOptionalUser();
        if (!user) {
            this.translate$(lang).subscribe();
        } else {
            this.http.put('/app/user/lang', { lang: lang }).subscribe({
                next: () => {
                    user.lang = lang;
                    this.Storage.set('EXAM_USER', user);
                    this.userChange.set(user);
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
        if (this.toastTapSubscription) {
            this.toastTapSubscription.unsubscribe();
            this.toastTapSubscription = undefined;
        }
    }

    checkSession = () => {
        this.http.get('/app/session', { responseType: 'text' }).subscribe({
            next: (resp) => {
                if (resp === 'alarm') {
                    // Unsubscribe previous toast tap subscription if it exists
                    if (this.toastTapSubscription) {
                        this.toastTapSubscription.unsubscribe();
                    }
                    this.toastTapSubscription = this.toast
                        .warning(
                            this.i18n.instant('i18n_continue_session'),
                            this.i18n.instant('i18n_session_will_expire_soon'),
                            {
                                timeOut: 30000,
                                toastComponent: SessionExpireWarningComponent,
                                progressBar: true,
                            },
                        )
                        .onTap.subscribe(() => {
                            this.http.put<void>('/app/session', {}).subscribe({
                                next: () => {
                                    this.toast.clear();
                                    this.toast.info(this.i18n.instant('i18n_session_extended'), '', {
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

    loadCourseCodePrefix$ = (): Observable<void> =>
        this.http.get<{ prefix: string }>('/app/settings/coursecodeprefix').pipe(
            tap((data) => this.Storage.set('COURSE_CODE_PREFIX', data.prefix)),
            map(() => undefined),
            catchError(() => {
                // If course code prefix fails (e.g., 403 due to session timing), continue without it
                // The prefix is not critical for the application flow
                return of(undefined);
            }),
        );

    login$ = (username: string, password: string): Observable<User> =>
        this.http
            .post<User>('/app/session', {
                username: username,
                password: password,
            })
            .pipe(
                switchMap((u) => this.prepareUser$(u)),
                switchMap((u) => this.processLogin$(u)),
                switchMap((u) =>
                    of(u).pipe(
                        delay(100),
                        switchMap(() =>
                            this.loadCourseCodePrefix$().pipe(
                                map(() => u),
                                catchError(() => of(u)),
                            ),
                        ),
                    ),
                ),
                tap((u) => {
                    this.Storage.set('EXAM_USER', u);
                    this.restartSessionCheck();
                    this.userChange.set(u);
                    if (u) {
                        this.toast.success(this.i18n.instant('i18n_welcome'), `${u.firstName} ${u.lastName}`, {
                            timeOut: 2000,
                        });
                    }
                    this.redirect(u);
                }),
                catchError((resp: HttpErrorResponse | undefined) => {
                    // If resp is undefined (e.g., user dismissed modal), complete without error
                    if (!resp) {
                        this.logout();
                        return EMPTY;
                    }
                    // case where we need to delay logout so error message can be shown for user to see.
                    else if (resp.headers.get('x-exam-delay-execution')) {
                        const orgs = resp.headers.get('x-exam-delay-execution');
                        this.toast.error(`${this.i18n.instant(resp.error)}: ${orgs}.`, 'Notice', {
                            timeOut: 10000,
                            positionClass: 'toast-center-center',
                        });
                        setTimeout(() => this.logout(), 10000);
                    } else {
                        this.logout();
                    }
                    return throwError(() => resp);
                }),
            );

    translate$ = (lang: string) => this.i18n.use(lang).pipe(tap(() => (this.document.documentElement.lang = lang)));

    private processLogin$ = (user: User): Observable<User> => {
        const externalLoginConfirmation$ = (u: User) =>
            defer(() => (u.externalUserOrg ? this.openExternalLoginConfirmationModal$(u) : of(u)));
        const userAgreementConfirmation$ = (u: User) =>
            defer(() => (!u.userAgreementAccepted ? this.openUserAgreementModal$(u) : of(u)));
        const roleSelectionConfirmation$ = (u: User) =>
            defer(() => (!u.loginRole ? this.openRoleSelectModal$(u) : of(u)));
        return externalLoginConfirmation$(user).pipe(
            switchMap(roleSelectionConfirmation$),
            switchMap(userAgreementConfirmation$),
        );
    };

    private openExternalLoginConfirmationModal$(user: User): Observable<User> {
        const modalRef = this.modal.openRef(ExternalLoginConfirmationDialogComponent, { size: 'lg' });
        modalRef.componentInstance.user = user;
        return this.modal.result$(modalRef).pipe(map(() => user));
    }

    private openUserAgreementModal$(user: User): Observable<User> {
        return this.modal.open$(EulaDialogComponent, { size: 'lg' }).pipe(
            switchMap(() => this.http.put('/app/users/agreement', {})),
            map(() => ({ ...user, userAgreementAccepted: true })),
        );
    }

    private openRoleSelectModal$(user: User): Observable<User> {
        const modalRef = this.modal.openRef(SelectRoleDialogComponent, { size: 'm' });
        modalRef.componentInstance.user = user;
        return this.modal.result$<Role>(modalRef).pipe(
            switchMap((role) => this.http.put<Role>(`/app/users/roles/${role.name}`, {})),
            map((role) => {
                user.loginRole = role.name;
                user.isAdmin = role.name === 'ADMIN';
                user.isSupport = role.name === 'SUPPORT';
                user.isTeacher = role.name === 'TEACHER';
                user.isStudent = role.name === 'STUDENT';
                user.isLanguageInspector = user.isTeacher && this.hasPermission(user, 'CAN_INSPECT_LANGUAGE');
                user.canCreateByodExam = !user.isStudent && this.hasPermission(user, 'CAN_CREATE_BYOD_EXAM');
                return user;
            }),
        );
    }

    private prepareUser$(user: User): Observable<User> {
        user.roles.forEach((role) => {
            switch (role.name) {
                case 'ADMIN':
                    role.displayName = 'i18n_admin';
                    role.icon = 'bi-shield-lock';
                    break;
                case 'TEACHER':
                    role.displayName = 'i18n_teacher';
                    role.icon = 'bi-person-workspace';
                    break;
                case 'STUDENT':
                    role.displayName = 'i18n_student';
                    role.icon = 'bi-mortarboard';
                    break;
                case 'SUPPORT':
                    role.displayName = 'i18n_support_person';
                    role.icon = 'bi-person-heart';
                    break;
            }
        });

        const loginRole = user.roles.length === 1 ? user.roles[0].name : null;
        const isTeacher = loginRole === 'TEACHER';
        return this.translate$(user.lang).pipe(
            map(() => ({
                ...user,
                loginRole: loginRole,
                isTeacher: isTeacher,
                isAdmin: loginRole === 'ADMIN',
                isStudent: loginRole === 'STUDENT',
                isSupport: loginRole === 'SUPPORT',
                isLanguageInspector: isTeacher && this.hasPermission(user, 'CAN_INSPECT_LANGUAGE'),
                canCreateByodExam: loginRole !== 'STUDENT' && this.hasPermission(user, 'CAN_CREATE_BYOD_EXAM'),
            })),
        );
    }

    private onLogoutSuccess(data: { logoutUrl: string }): void {
        this.toast.success(this.i18n.instant('i18n_logout_success'));
        const location = window.location;
        const localLogout = `${location.protocol}//${location.host}/Shibboleth.sso/Logout`;
        const env = this.getEnv();
        this.Storage.clear();
        if (data && data.logoutUrl) {
            location.href = `${localLogout}?return=${data.logoutUrl}`;
        } else if (!env || env.isProd) {
            // redirect to SP-logout directly
            location.href = localLogout;
        } else {
            // DEV logout - update signal to trigger effect in app.component
            this.devLogoutChange.set(Date.now());
        }
    }

    private redirect(user: User): void {
        const url = this.router.url.startsWith('/?') ? '/' : this.router.url;
        if (url === '/' && user.isLanguageInspector) {
            this.router.navigate(['staff/inspections']);
        } else if (url === '/') {
            let state;
            if (user.loginRole === 'STUDENT') state = 'dashboard';
            else if (user.loginRole === 'TEACHER') state = 'staff/teacher';
            else state = 'staff/admin';
            this.router.navigate([state]);
        }
    }

    private hasPermission(user: User, permission: string) {
        if (!user) {
            return false;
        }
        return user.permissions.some((p) => p.type === permission);
    }
}
