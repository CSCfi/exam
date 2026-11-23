// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import type { Observable } from 'rxjs';
import { EMPTY, Subject, of } from 'rxjs';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { StorageService } from 'src/app/shared/storage/storage.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import type { Role, User } from './session.model';
import { SessionService } from './session.service';

/** As the backend answers a login */
const loginResponse = (roles: string[], overrides: Partial<User> = {}): User =>
    ({
        id: 1,
        firstName: 'Jane',
        lastName: 'Doe',
        lang: 'fi',
        roles: roles.map((name) => ({ name })),
        permissions: [],
        userAgreementAccepted: true,
        ...overrides,
    }) as unknown as User;

describe('SessionService login and session', () => {
    let service: SessionService;
    let http: HttpTestingController;
    let store: Map<string, unknown>;
    const router = { url: '/', currentNavigation: vi.fn(), navigate: vi.fn() };
    let tap$: Subject<void>;
    let hidden$: Subject<void>;
    const toast = {
        success: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        clear: vi.fn(),
        warning: vi.fn(() => ({ onTap: tap$, onHidden: hidden$ })),
    };
    const roleDialog = signal<User | undefined>(undefined);
    const modal = {
        openRef: vi.fn(() => ({ componentInstance: { user: roleDialog } })),
        result$: vi.fn<() => Observable<unknown>>(),
        open$: vi.fn<() => Observable<unknown>>(),
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        store = new Map();
        router.url = '/';
        router.currentNavigation.mockReturnValue(null);
        tap$ = new Subject();
        hidden$ = new Subject();
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
                { provide: ModalService, useValue: modal },
                {
                    provide: StorageService,
                    useValue: {
                        get: (k: string) => store.get(k),
                        set: (k: string, v: unknown) => store.set(k, v),
                        has: (k: string) => store.has(k),
                        remove: (k: string) => store.delete(k),
                        clear: () => store.clear(),
                    },
                },
            ],
        });
        service = TestBed.inject(SessionService);
        http = TestBed.inject(HttpTestingController);
        // A development environment, so that logging out does not leave the page
        store.set('EXAM-ENV', { isProd: false });
    });

    afterEach(() => {
        service.disableSessionCheck();
        http.verify();
        vi.useRealTimers();
    });

    /** Logs in with the given backend answer, through the course code prefix */
    const login = (answer: User) => {
        const result: { user?: User; error?: unknown; done: boolean } = { done: false };
        service.login$('', '').subscribe({
            next: (u) => (result.user = u),
            error: (e) => (result.error = e),
            complete: () => (result.done = true),
        });
        http.expectOne((r) => r.method === 'POST' && r.url === '/app/session').flush(answer);
        return result;
    };

    const finish = () => {
        vi.advanceTimersByTime(100);
        http.expectOne('/app/settings/coursecodeprefix').flush({ prefix: 'AY' });
    };

    const expectLogout = () => {
        http.expectOne((r) => r.method === 'DELETE' && r.url === '/app/session').flush({});
    };

    describe('a user with one role', () => {
        it('gets that role, its flags and a welcome, and lands on their front page', () => {
            const result = login(loginResponse(['TEACHER']));
            finish();

            const user = result.user!;
            expect(user.loginRole).toBe('TEACHER');
            expect(user.isTeacher).toBe(true);
            expect(user.isAdmin || user.isStudent || user.isSupport).toBe(false);
            expect(user.roles[0]).toMatchObject({ displayName: 'i18n_teacher', icon: 'bi-person-workspace' });
            expect(store.get('EXAM_USER')).toBe(user);
            expect(store.get('COURSE_CODE_PREFIX')).toBe('AY');
            expect(service.userChange()).toBe(user);
            expect(toast.success).toHaveBeenCalledWith('i18n_welcome', 'Jane Doe', { timeOut: 2000 });
            expect(router.navigate).toHaveBeenCalledWith(['staff/teacher']);
        });

        it.each([
            ['STUDENT', [], ['dashboard']],
            ['ADMIN', [], ['staff/admin']],
            ['SUPPORT', [], ['staff/admin']],
            ['TEACHER', [{ type: 'CAN_INSPECT_LANGUAGE' }], ['staff/inspections']],
        ])('as %s lands on its front page', (role, permissions, target) => {
            login(loginResponse([role], { permissions } as Partial<User>));
            finish();
            expect(router.navigate).toHaveBeenCalledWith(target);
        });

        it('may create BYOD exams with the permission, unless a student', () => {
            const byod = { permissions: [{ type: 'CAN_CREATE_BYOD_EXAM' }] } as Partial<User>;
            const teacher = login(loginResponse(['TEACHER'], byod));
            finish();
            expect(teacher.user!.canCreateByodExam).toBe(true);
            const student = login(loginResponse(['STUDENT'], byod));
            finish();
            expect(student.user!.canCreateByodExam).toBe(false);
        });

        it('stays on the page asked for, and leaves a navigation under way alone', () => {
            router.url = '/staff/exams/1/1';
            login(loginResponse(['TEACHER']));
            finish();
            expect(router.navigate).not.toHaveBeenCalled();

            // The examination interceptor is already taking a student to the waiting room
            router.url = '/';
            router.currentNavigation.mockReturnValue({});
            login(loginResponse(['STUDENT']));
            finish();
            expect(router.navigate).not.toHaveBeenCalled();
        });

        it('logs in even when the course code prefix cannot be read', () => {
            const result = login(loginResponse(['TEACHER']));
            vi.advanceTimersByTime(100);
            http.expectOne('/app/settings/coursecodeprefix').flush('', { status: 403, statusText: 'Forbidden' });
            expect(result.user?.loginRole).toBe('TEACHER');
        });
    });

    describe('a user with several roles', () => {
        it('picks one, which the backend sets for the session', () => {
            modal.result$.mockReturnValue(of({ name: 'ADMIN' } as Role));
            const result = login(loginResponse(['TEACHER', 'ADMIN']));
            expect(roleDialog()?.roles).toHaveLength(2);
            http.expectOne((r) => r.method === 'PUT' && r.url === '/app/users/roles/ADMIN').flush({ name: 'ADMIN' });
            finish();

            expect(result.user!.loginRole).toBe('ADMIN');
            expect(result.user!.isAdmin).toBe(true);
            expect(result.user!.isTeacher).toBe(false);
            expect(router.navigate).toHaveBeenCalledWith(['staff/admin']);
        });
    });

    describe('confirmations', () => {
        it('ask a user of another organisation to confirm, and a new user to accept the agreement', () => {
            modal.result$.mockReturnValue(of(undefined));
            modal.open$.mockReturnValue(of(undefined));
            const result = login(
                loginResponse(['STUDENT'], { externalUserOrg: 'other.org', userAgreementAccepted: false }),
            );
            http.expectOne((r) => r.method === 'PUT' && r.url === '/app/users/agreement').flush({});
            finish();

            expect(modal.openRef).toHaveBeenCalled();
            expect(modal.open$).toHaveBeenCalled();
            expect(result.user!.userAgreementAccepted).toBe(true);
            expect(result.user!.loginRole).toBe('STUDENT');
        });

        it.each([
            ['the other organisation', { externalUserOrg: 'other.org' }, ['STUDENT']],
            ['the user agreement', { userAgreementAccepted: false }, ['STUDENT']],
            ['the role', {}, ['TEACHER', 'ADMIN']],
        ])('log out when %s is not confirmed', (_, overrides, roles) => {
            // Cancelling dismisses the dialog, which completes without a value
            modal.result$.mockReturnValue(EMPTY);
            modal.open$.mockReturnValue(EMPTY);
            const result = login(loginResponse(roles, overrides as Partial<User>));

            expectLogout();
            expect(result.user).toBeUndefined();
            expect(store.has('EXAM_USER')).toBe(false);
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });

    describe('a refused login', () => {
        it('names the home organisations and logs out once they could be read', () => {
            const result: { error?: unknown } = {};
            service.login$('', '').subscribe({ error: (e) => (result.error = e) });
            http.expectOne('/app/session').flush('i18n_error_disallowed_login', {
                status: 400,
                statusText: 'Bad Request',
                headers: new HttpHeaders({ 'x-exam-delay-execution': 'funet.fi, test.org' }),
            });

            expect(result.error).toBeDefined();
            expect(toast.error).toHaveBeenCalledWith('i18n_error_disallowed_login: funet.fi, test.org.', 'Notice', {
                timeOut: 10000,
                position: 'center',
            });
            http.expectNone((r) => r.method === 'DELETE');
            vi.advanceTimersByTime(10000);
            expectLogout();
        });

        it('logs out at once otherwise', () => {
            const result: { error?: unknown } = {};
            service.login$('', '').subscribe({ error: (e) => (result.error = e) });
            http.expectOne('/app/session').flush('no', { status: 400, statusText: 'Bad Request' });
            expect(result.error).toBeDefined();
            expectLogout();
        });
    });

    describe('the session check', () => {
        const ping = (answer: string) =>
            http.expectOne((r) => r.method === 'GET' && r.url === '/app/session').flush(answer);

        it('runs every 30 seconds until stopped', () => {
            service.restartSessionCheck();
            vi.advanceTimersByTime(30000);
            ping('');
            vi.advanceTimersByTime(30000);
            ping('');
            service.disableSessionCheck();
            vi.advanceTimersByTime(60000);
            http.expectNone('/app/session');
        });

        it('warns before the session runs out, and extends it when the warning is tapped', () => {
            service.checkSession();
            ping('alarm');
            expect(toast.warning).toHaveBeenCalledWith('i18n_continue_session', 'i18n_session_will_expire_soon', {
                timeOut: 30000,
                progressBar: true,
            });

            tap$.next();
            http.expectOne((r) => r.method === 'PUT' && r.url === '/app/session').flush({});
            expect(toast.info).toHaveBeenCalledWith('i18n_session_extended', '', { timeOut: 2000 });
            // Only once per warning
            tap$.next();
            http.expectNone((r) => r.method === 'PUT');
        });

        it('extends it with Ctrl+E as well, but not once the warning is gone', () => {
            service.checkSession();
            ping('alarm');
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true }));
            http.expectOne((r) => r.method === 'PUT').flush({});

            service.checkSession();
            ping('alarm');
            hidden$.next();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true }));
            http.expectNone((r) => r.method === 'PUT');
        });

        it('logs out once the session is gone', () => {
            store.set('EXAM_USER', loginResponse(['TEACHER']));
            service.checkSession();
            ping('no_session');
            expectLogout();
            expect(store.has('EXAM_USER')).toBe(false);
            expect(service.userChange()).toBeUndefined();
        });
    });

    describe('logging out', () => {
        const location = window.location;
        const fakeLocation = { protocol: 'https:', host: 'exam.uni.fi', href: '' };

        beforeEach(() => Object.defineProperty(window, 'location', { value: fakeLocation, configurable: true }));
        afterEach(() => Object.defineProperty(window, 'location', { value: location, configurable: true }));

        const logout = (answer: { logoutUrl?: string }) => {
            service.logout();
            http.expectOne((r) => r.method === 'DELETE').flush(answer);
        };

        it("goes through the identity provider's logout when it gives one", () => {
            logout({ logoutUrl: 'https://idp.fi/logout' });
            expect(fakeLocation.href).toBe('https://exam.uni.fi/Shibboleth.sso/Logout?return=https://idp.fi/logout');
        });

        it('ends the local Shibboleth session in production', () => {
            store.set('EXAM-ENV', { isProd: true });
            logout({});
            expect(fakeLocation.href).toBe('https://exam.uni.fi/Shibboleth.sso/Logout');
        });

        it('only clears the session in development', () => {
            fakeLocation.href = '';
            logout({});
            expect(fakeLocation.href).toBe('');
            expect(service.devLogoutChange()).toBeDefined();
            expect(store.size).toBe(0);
        });
    });

    describe('switching language', () => {
        it("stores a logged-in user's choice", () => {
            store.set('EXAM_USER', loginResponse(['TEACHER']));
            service.switchLanguage('sv');
            const req = http.expectOne('/app/user/lang');
            expect(req.request.body).toEqual({ lang: 'sv' });
            req.flush({});
            expect((store.get('EXAM_USER') as User).lang).toBe('sv');
            expect(document.documentElement.lang).toBe('sv');
        });

        it('only changes the page language before login', () => {
            service.switchLanguage('en');
            http.expectNone('/app/user/lang');
            expect(document.documentElement.lang).toBe('en');
        });

        it('tells when the choice could not be stored', () => {
            store.set('EXAM_USER', loginResponse(['TEACHER']));
            service.switchLanguage('sv');
            http.expectOne('/app/user/lang').flush('', { status: 500, statusText: 'Error' });
            expect(toast.error).toHaveBeenCalledWith('failed to switch language');
            expect((store.get('EXAM_USER') as User).lang).toBe('fi');
        });
    });
});
