// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { ExaminationStatusService } from './examination/examination-status.service';
import { User } from './session/session.model';
import { SessionService } from './session/session.service';

@Component({
    selector: 'xm-navigation',
    template: '',
    standalone: true,
})
class MockNavigationComponent {}

@Component({
    selector: 'xm-dev-login',
    template: '',
    standalone: true,
})
class MockDevLoginComponent {}

describe('AppComponent', () => {
    let mockRouter: jasmine.SpyObj<Router>;
    let mockSessionService: jasmine.SpyObj<SessionService>;
    let mockExaminationStatusService: jasmine.SpyObj<ExaminationStatusService>;
    let mockTranslateService: jasmine.SpyObj<TranslateService>;

    beforeEach(async () => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockSessionService = jasmine.createSpyObj(
            'SessionService',
            ['getUser', 'getEnv$', 'switchLanguage', 'logout', 'translate$', 'restartSessionCheck', 'login$'],
            {
                devLogoutChange$: of(),
            },
        );
        mockExaminationStatusService = jasmine.createSpyObj('ExaminationStatusService', [], {
            examinationStarting$: of(),
            examinationEnding$: of(),
        });
        mockTranslateService = jasmine.createSpyObj('TranslateService', ['setDefaultLang', 'use', 'get', 'instant'], {
            onLangChange: of({ lang: 'en' }),
            onTranslationChange: of({}),
            onDefaultLangChange: of({}),
        });
        mockTranslateService.get.and.returnValue(of(''));
        mockTranslateService.instant.and.returnValue('');

        mockSessionService.getUser.and.returnValue(null as unknown as User);
        mockSessionService.translate$.and.returnValue(of(void 0));
        mockSessionService.login$.and.returnValue(of({} as User));

        await TestBed.configureTestingModule({
            imports: [AppComponent, MockNavigationComponent, MockDevLoginComponent],
            providers: [
                { provide: Router, useValue: mockRouter },
                { provide: SessionService, useValue: mockSessionService },
                { provide: ExaminationStatusService, useValue: mockExaminationStatusService },
                { provide: TranslateService, useValue: mockTranslateService },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    describe('devLoginRequired signal', () => {
        it('should be true when in DEV environment', fakeAsync(() => {
            mockSessionService.getEnv$.and.returnValue(of('DEV'));

            const fixture = TestBed.createComponent(AppComponent);
            const app = fixture.componentInstance;
            app.ngOnInit();
            tick();

            expect(app.devLoginRequired()).toBe(true);
            expect(mockSessionService.switchLanguage).toHaveBeenCalledWith('en');
            expect(mockSessionService.login$).not.toHaveBeenCalled();
        }));

        it('should be false when in PROD environment', fakeAsync(() => {
            mockSessionService.getEnv$.and.returnValue(of('PROD'));

            const fixture = TestBed.createComponent(AppComponent);
            const app = fixture.componentInstance;
            app.ngOnInit();
            tick();

            expect(app.devLoginRequired()).toBe(false);
            expect(mockSessionService.switchLanguage).toHaveBeenCalledWith('en');
            expect(mockSessionService.login$).toHaveBeenCalledWith('', '');
        }));

        it('should handle environment error gracefully', fakeAsync(() => {
            mockSessionService.getEnv$.and.returnValue(of('INVALID' as 'DEV' | 'PROD'));

            const fixture = TestBed.createComponent(AppComponent);
            const app = fixture.componentInstance;
            app.ngOnInit();
            tick();

            expect(app.devLoginRequired()).toBe(false);
            expect(mockSessionService.switchLanguage).toHaveBeenCalledWith('en');
            expect(mockSessionService.login$).not.toHaveBeenCalled();
        }));
    });
});
