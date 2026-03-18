// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrModule } from 'ngx-toastr';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { StorageService } from 'src/app/shared/storage/storage.service';
import { vi } from 'vitest';
import type { User } from './session.model';
import { SessionService } from './session.service';

function makeUser(overrides: Partial<User> = {}): User {
    return {
        id: 1,
        eppn: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        lang: 'en',
        loginRole: 'TEACHER',
        roles: [{ name: 'TEACHER' }],
        userAgreementAccepted: true,
        userIdentifier: 'u1',
        permissions: [],
        isAdmin: false,
        isStudent: false,
        isTeacher: true,
        isSupport: false,
        isLanguageInspector: false,
        employeeNumber: null,
        lastLogin: null,
        canCreateByodExam: false,
        ...overrides,
    };
}

describe('SessionService', () => {
    let service: SessionService;
    let mockStorage: {
        get: ReturnType<typeof vi.fn>;
        set: ReturnType<typeof vi.fn>;
        has: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
        clear: ReturnType<typeof vi.fn>;
        keys: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        mockStorage = {
            get: vi.fn(),
            set: vi.fn(),
            has: vi.fn().mockReturnValue(false),
            remove: vi.fn(),
            clear: vi.fn(),
            keys: vi.fn().mockReturnValue([]),
        };
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot(), ToastrModule.forRoot()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([]),
                SessionService,
                { provide: StorageService, useValue: mockStorage },
                { provide: ModalService, useValue: { openRef: vi.fn(), open$: vi.fn(), result$: vi.fn() } },
            ],
        });
        service = TestBed.inject(SessionService);
    });

    afterEach(() => TestBed.inject(HttpTestingController).verify());

    describe('getUser', () => {
        it('should throw when EXAM_USER is not in storage', () => {
            mockStorage.has.mockReturnValue(false);
            expect(() => service.getUser()).toThrow('EXAM_USER not found');
        });

        it('should return the stored user when EXAM_USER exists', () => {
            const user = makeUser();
            mockStorage.has.mockReturnValue(true);
            mockStorage.get.mockReturnValue(user);
            expect(service.getUser()).toEqual(user);
        });
    });

    describe('getOptionalUser', () => {
        it('should return undefined when no user is stored', () => {
            mockStorage.get.mockReturnValue(undefined);
            expect(service.getOptionalUser()).toBeUndefined();
        });

        it('should return the stored user', () => {
            const user = makeUser();
            mockStorage.get.mockReturnValue(user);
            expect(service.getOptionalUser()).toEqual(user);
        });
    });

    describe('getUserName', () => {
        it('should return empty string when no user is stored', () => {
            mockStorage.get.mockReturnValue(undefined);
            expect(service.getUserName()).toBe('');
        });

        it('should return "firstName lastName" when user is stored', () => {
            mockStorage.get.mockReturnValue(makeUser({ firstName: 'Jane', lastName: 'Doe' }));
            expect(service.getUserName()).toBe('Jane Doe');
        });
    });

    describe('getLocale', () => {
        it('should return "en" when no user is stored', () => {
            mockStorage.get.mockReturnValue(undefined);
            expect(service.getLocale()).toBe('en');
        });

        it('should return the user language when user is stored', () => {
            mockStorage.get.mockReturnValue(makeUser({ lang: 'fi' }));
            expect(service.getLocale()).toBe('fi');
        });
    });

    describe('getEnv$', () => {
        it('should store the env and emit DEV when isProd is false', async () => {
            const httpMock = TestBed.inject(HttpTestingController);
            const result$ = service.getEnv$();
            let resolved: string | undefined;
            result$.subscribe((v) => (resolved = v));
            httpMock.expectOne('/app/settings/environment').flush({ isProd: false });
            expect(resolved).toBe('DEV');
            expect(mockStorage.set).toHaveBeenCalledWith('EXAM-ENV', { isProd: false });
        });

        it('should emit PROD when isProd is true', async () => {
            const httpMock = TestBed.inject(HttpTestingController);
            let resolved: string | undefined;
            service.getEnv$().subscribe((v) => (resolved = v));
            httpMock.expectOne('/app/settings/environment').flush({ isProd: true });
            expect(resolved).toBe('PROD');
        });
    });
});
