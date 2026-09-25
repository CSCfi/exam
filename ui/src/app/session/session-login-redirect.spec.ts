// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { examinationInterceptor } from 'src/app/interceptors/examination.interceptor';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { StorageService } from 'src/app/shared/storage/storage.service';
import { vi } from 'vitest';
import type { User } from './session.model';
import { SessionService } from './session.service';

@Component({ template: '' })
class DummyComponent {}

const student: User = {
    id: 1,
    eppn: 'student@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    lang: 'en',
    loginRole: 'STUDENT',
    roles: [{ name: 'STUDENT' }],
    userAgreementAccepted: true,
    userIdentifier: 'u1',
    permissions: [],
    isAdmin: false,
    isStudent: true,
    isTeacher: false,
    isSupport: false,
    isLanguageInspector: false,
    employeeNumber: null,
    lastLogin: null,
    canCreateByodExam: false,
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mimics the production routing setup: the exam related views are lazily loaded, so their
// navigation does not finish within the same tick as the login response that triggered it.
const lazyComponent = (loadTime: number) => () => wait(loadTime).then(() => DummyComponent);

describe('SessionService login redirect', () => {
    let service: SessionService;
    let httpMock: HttpTestingController;
    let router: Router;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideHttpClient(withInterceptors([examinationInterceptor])),
                provideHttpClientTesting(),
                provideRouter([
                    { path: '', component: DummyComponent },
                    { path: 'dashboard', loadComponent: lazyComponent(10) },
                    { path: 'waitingroom/:id/:hash', loadComponent: lazyComponent(300) },
                ]),
                SessionService,
                {
                    provide: StorageService,
                    useValue: {
                        get: vi.fn(),
                        set: vi.fn(),
                        has: vi.fn().mockReturnValue(false),
                        remove: vi.fn(),
                        clear: vi.fn(),
                        keys: vi.fn().mockReturnValue([]),
                    },
                },
                { provide: ModalService, useValue: { openRef: vi.fn(), open$: vi.fn(), result$: vi.fn() } },
                {
                    provide: ToastrService,
                    useValue: {
                        success: vi.fn(),
                        info: vi.fn(),
                        warning: vi.fn(),
                        error: vi.fn(),
                        clear: vi.fn(),
                    },
                },
            ],
        });
        service = TestBed.inject(SessionService);
        httpMock = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);
    });

    afterEach(() => {
        httpMock.verify();
        service.disableSessionCheck();
    });

    it('should not cancel the waiting room redirect signalled by the reservation headers', async () => {
        const reservationHeaders = { 'x-exam-upcoming-exam': 'abc123:::7' };
        service.login$('student', 'pass').subscribe();

        httpMock.expectOne({ method: 'POST', url: '/app/session' }).flush(student, { headers: reservationHeaders });
        // The translation load and the delay(100) preceding the course code prefix request
        await wait(150);
        httpMock.expectOne('/app/settings/coursecodeprefix').flush({ prefix: '' }, { headers: reservationHeaders });
        await wait(400);

        expect(router.url).toBe('/waitingroom/7/abc123');
    });

    it('should redirect to the dashboard when no reservation headers are present', async () => {
        service.login$('student', 'pass').subscribe();

        httpMock.expectOne({ method: 'POST', url: '/app/session' }).flush(student);
        await wait(150);
        httpMock.expectOne('/app/settings/coursecodeprefix').flush({ prefix: '' });
        await wait(400);

        expect(router.url).toBe('/dashboard');
    });
});
