// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
    let c: SettingsComponent;
    let http: HttpTestingController;
    const toast = { info: vi.fn(), error: vi.fn() };

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toast }],
        });
        http = TestBed.inject(HttpTestingController);
        c = TestBed.runInInjectionContext(() => new SettingsComponent());
        http.expectOne('/app/config').flush({ eula: '<p>Old</p>', reviewDeadline: 14, reservationWindowSize: 30 });
        http.expectOne('/app/attributes').flush(['eppn', 'mail']);
    });

    afterEach(() => http.verify());

    const put = (url: string) => {
        const req = http.expectOne((r) => r.method === 'PUT' && r.url === url);
        return req;
    };

    it('should load the configuration and the login attributes', () => {
        expect(c.reviewDeadline).toBe(14);
        expect(c.reservationWindowSize).toBe(30);
        expect(c.attributes()).toEqual(['eppn', 'mail']);
    });

    it('should save a changed agreement, asking everyone to accept it again unless the change is minor', () => {
        c.eulaChanged('<p>New</p>');
        c.updateAgreement();
        let req = put('/app/settings/agreement');
        expect(req.request.body).toEqual({ value: '<p>New</p>', minorUpdate: false });
        req.flush({});
        expect(toast.info).toHaveBeenCalled();

        c.minorAgreementUpdate = true;
        c.updateAgreement();
        req = put('/app/settings/agreement');
        expect(req.request.body.minorUpdate).toBe(true);
        req.flush({});
    });

    it('should save the review deadline and reservation window as text', () => {
        c.reviewDeadline = 21;
        c.updateDeadline();
        let req = put('/app/settings/deadline');
        expect(req.request.body).toEqual({ value: '21' });
        req.flush({});

        c.reservationWindowSize = 60;
        c.updateReservationWindow();
        req = put('/app/settings/reservationWindow');
        expect(req.request.body).toEqual({ value: '60' });
        req.flush({});
    });

    it('should keep a value when the field is emptied', () => {
        c.reviewDeadline = undefined;
        expect(c.reviewDeadline).toBe(14);
    });

    it('should show why saving failed', () => {
        c.reviewDeadline = 21;
        c.updateDeadline();
        put('/app/settings/deadline').flush('invalid', { status: 400, statusText: 'Bad Request' });
        expect(toast.error).toHaveBeenCalled();
    });
});
