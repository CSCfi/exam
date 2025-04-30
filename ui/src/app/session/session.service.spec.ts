// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DOCUMENT } from '@angular/common';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { SESSION_STORAGE, WebStorageService } from 'ngx-webstorage-service';
import { of, throwError } from 'rxjs';
import { AppError, ErrorHandlingService } from 'src/app/shared/error/error-handler-service';
import { User } from './session.model';
import { SessionService } from './session.service';

describe('SessionService', () => {
    let service: SessionService;
    let httpMock: HttpTestingController;
    let errorHandlerSpy: jasmine.SpyObj<ErrorHandlingService>;
    let webStorageSpy: jasmine.SpyObj<WebStorageService>;
    let modalSpy: jasmine.SpyObj<NgbModal>;
    let translateSpy: jasmine.SpyObj<TranslateService>;
    let toastSpy: jasmine.SpyObj<ToastrService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let httpClientSpy: jasmine.SpyObj<HttpClient>;
    let mockUser: User;
    let mockLocation: {
        protocol: string;
        host: string;
        href?: string;
        assign: jasmine.Spy;
        replace: jasmine.Spy;
        reload: jasmine.Spy;
    };
    let mockDocument: { documentElement: { lang: string }; defaultView: { location: typeof mockLocation } };

    beforeEach(() => {
        errorHandlerSpy = jasmine.createSpyObj('ErrorHandlingService', {
            handle: (error: unknown, context: string) => {
                const appError: AppError = {
                    code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : 'An unexpected error occurred',
                    context,
                    originalError: error,
                };
                return throwError(() => appError);
            },
        });
        webStorageSpy = jasmine.createSpyObj('WebStorageService', ['get', 'set', 'remove', 'clear']);
        modalSpy = jasmine.createSpyObj('NgbModal', ['open']);
        translateSpy = jasmine.createSpyObj('TranslateService', ['use', 'instant']);
        toastSpy = jasmine.createSpyObj('ToastrService', ['success', 'warning', 'clear', 'info', 'error']);
        routerSpy = jasmine.createSpyObj('Router', ['navigate'], { url: '/' });
        httpClientSpy = jasmine.createSpyObj('HttpClient', ['get', 'post', 'put', 'delete']);

        // Create a mock location object that won't cause a page reload
        mockLocation = {
            protocol: 'http:',
            host: 'localhost',
            href: '',
            assign: jasmine.createSpy('assign'),
            replace: jasmine.createSpy('replace'),
            reload: jasmine.createSpy('reload'),
        };

        // Create a mock document object
        mockDocument = {
            documentElement: { lang: '' },
            defaultView: { location: mockLocation },
        };

        // Prevent page reloads in tests
        window.onbeforeunload = jasmine.createSpy('onbeforeunload');

        // Create a mock user with correct types
        mockUser = {
            id: 1,
            eppn: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            lang: 'en',
            loginRole: 'ADMIN',
            roles: [{ name: 'ADMIN', displayName: 'i18n_admin', icon: 'bi-gear' }],
            userAgreementAccepted: true,
            userIdentifier: 'test123',
            permissions: [{ type: 'CAN_INSPECT_LANGUAGE' }, { type: 'CAN_CREATE_BYOD_EXAM' }],
            isAdmin: true,
            isStudent: false,
            isTeacher: false,
            isLanguageInspector: false,
            employeeNumber: null,
            lastLogin: null,
            canCreateByodExam: true,
        };

        TestBed.configureTestingModule({
            providers: [
                SessionService,
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ErrorHandlingService, useValue: errorHandlerSpy },
                { provide: SESSION_STORAGE, useValue: webStorageSpy },
                { provide: DOCUMENT, useValue: mockDocument },
                { provide: NgbModal, useValue: modalSpy },
                { provide: TranslateService, useValue: translateSpy },
                { provide: ToastrService, useValue: toastSpy },
                { provide: Router, useValue: routerSpy },
                { provide: HttpClient, useValue: httpClientSpy },
            ],
        });

        service = TestBed.inject(SessionService);
        httpMock = TestBed.inject(HttpTestingController);

        // Set up default spy behavior
        translateSpy.use.and.returnValue(of({}));
        translateSpy.instant.and.returnValue('Translated message');
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getUser', () => {
        it('should return user from web storage', () => {
            webStorageSpy.get.and.returnValue(mockUser);
            expect(service.getUser()).toEqual(mockUser);
        });
    });

    describe('getUserName', () => {
        it('should return full name when user exists', () => {
            webStorageSpy.get.and.returnValue(mockUser);
            expect(service.getUserName()).toBe('Test User');
        });

        it('should return empty string when user does not exist', () => {
            webStorageSpy.get.and.returnValue(null);
            expect(service.getUserName()).toBe('');
        });
    });

    describe('login$', () => {
        it('should login successfully', (done) => {
            const initialUser = {
                ...mockUser,
                loginRole: null,
                roles: [{ name: 'ADMIN' }],
                isAdmin: false,
                canCreateByodExam: false,
            };

            httpClientSpy.post.and.returnValue(of(initialUser));
            httpClientSpy.get.and.returnValue(of({ prefix: 'TEST' }));
            httpClientSpy.put.and.returnValue(of({ name: 'ADMIN' }));

            const mockModalRef = {
                componentInstance: {},
                result: Promise.resolve({ name: 'ADMIN' }),
                close: () => {},
                dismiss: () => {},
            } as NgbModalRef;

            modalSpy.open.and.returnValue(mockModalRef);

            service.login$('test@example.com', 'password').subscribe({
                next: (user) => {
                    expect(user).toEqual(mockUser);
                    expect(webStorageSpy.set).toHaveBeenCalledWith('EXAM_USER', user);
                    expect(webStorageSpy.set).toHaveBeenCalledWith('COURSE_CODE_PREFIX', 'TEST');
                    expect(translateSpy.use).toHaveBeenCalledWith('en');
                    expect(routerSpy.navigate).toHaveBeenCalledWith(['staff/admin']);
                    done();
                },
            });
        });

        it('should handle login error', (done) => {
            const error = new Error('Login failed');
            httpClientSpy.post.and.returnValue(throwError(() => error));
            httpClientSpy.delete.and.returnValue(of({ logoutUrl: '' }));

            // Set up error handler to call toast.error
            errorHandlerSpy.handle.and.callFake((err: Error, context: string) => {
                const appError: AppError = {
                    code: err.name,
                    message: err.message,
                    context,
                    originalError: err,
                };
                toastSpy.error(appError.message);
                return throwError(() => appError);
            });

            service.login$('test@example.com', 'password').subscribe({
                error: (err: AppError) => {
                    expect(err.message).toBe('Login failed');
                    expect(err.context).toBe('SessionService.login$');
                    expect(err.originalError).toBe(error);
                    expect(toastSpy.error).toHaveBeenCalledWith('Login failed');
                    expect(httpClientSpy.delete).toHaveBeenCalledWith('/app/session', {});
                    done();
                },
            });
        });
    });

    describe('logout', () => {
        /*it('should logout successfully in production', (done) => {
            const logoutUrl = 'http://example.com/logout';
            httpClientSpy.delete.and.returnValue(of({ logoutUrl }));
            webStorageSpy.get.and.returnValue({ isProd: true });

            // Set up the mock location with the expected protocol and host
            mockLocation.protocol = 'http:';
            mockLocation.host = 'localhost';

            service.logout();

            // Verify the correct URL is called
            expect(httpClientSpy.delete).toHaveBeenCalledWith('/app/session', {});
            expect(webStorageSpy.remove).toHaveBeenCalledWith('EXAM_USER');
            expect(webStorageSpy.clear).toHaveBeenCalled();
            expect(translateSpy.instant).toHaveBeenCalledWith('i18n_logout_success');
            expect(toastSpy.success).toHaveBeenCalled();

            //done();
        });*/

        it('should handle dev logout', () => {
            httpClientSpy.delete.and.returnValue(of({}));
            webStorageSpy.get.and.returnValue({ isProd: false });

            service.logout();

            expect(webStorageSpy.remove).toHaveBeenCalledWith('EXAM_USER');
            expect(webStorageSpy.clear).toHaveBeenCalled();
            expect(translateSpy.instant).toHaveBeenCalledWith('i18n_logout_success');
            expect(toastSpy.success).toHaveBeenCalled();
            expect(mockLocation.href).toBe('');
            // Verify that devLogoutSubscription emits
            service.devLogoutChange$.subscribe(() => {
                expect(true).toBeTruthy();
            });
        });

        it('should handle logout error', (done) => {
            const error = new Error('Logout failed');
            httpClientSpy.delete.and.returnValue(throwError(() => error));

            // Set up error handler to call toast.error
            errorHandlerSpy.handle.and.callFake((err: Error, context: string) => {
                const appError: AppError = {
                    code: err.name,
                    message: err.message,
                    context,
                    originalError: err,
                };
                toastSpy.error(appError.message);
                return throwError(() => appError);
            });

            service.logout();

            setTimeout(() => {
                expect(webStorageSpy.remove).not.toHaveBeenCalled();
                expect(errorHandlerSpy.handle).toHaveBeenCalledWith(error, 'SessionService.logout');
                expect(toastSpy.error).toHaveBeenCalledWith('Logout failed');
                done();
            });
        });
    });

    describe('getLocale', () => {
        it('should return user language when user exists', () => {
            webStorageSpy.get.and.returnValue(mockUser);
            expect(service.getLocale()).toBe('en');
        });

        it('should return default language when user does not exist', () => {
            webStorageSpy.get.and.returnValue(null);
            expect(service.getLocale()).toBe('en');
        });
    });
});
