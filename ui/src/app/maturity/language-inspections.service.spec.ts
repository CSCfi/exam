// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { EMPTY, of } from 'rxjs';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { LanguageInspectionService } from './language-inspections.service';
import type { LanguageInspection } from './maturity.model';

describe('LanguageInspectionService', () => {
    let service: LanguageInspectionService;
    let http: HttpTestingController;
    const router = { navigate: vi.fn() };
    const toast = { error: vi.fn() };
    const dialogs = { open$: vi.fn() };
    const statement = signal('');
    const modal = { openRef: vi.fn(() => ({ componentInstance: { statement } })) };
    const inspection = { id: 4, exam: { id: 9 } } as LanguageInspection;

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: Router, useValue: router },
                { provide: ToastService, useValue: toast },
                { provide: ConfirmationDialogService, useValue: dialogs },
                { provide: ModalService, useValue: modal },
            ],
        });
        service = TestBed.inject(LanguageInspectionService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('should query the inspections with the given filters', () => {
        let result: LanguageInspection[] | undefined;
        service.query({ month: '2026-11' }).subscribe((r) => (result = r));
        const req = http.expectOne((r) => r.url === '/app/inspections');
        expect(req.request.params.get('month')).toBe('2026-11');
        req.flush([inspection]);
        expect(result).toEqual([inspection]);
    });

    it('should take an inspection on confirmation and open its assessment', () => {
        dialogs.open$.mockReturnValue(of(true));
        service.assignInspection(inspection);
        const req = http.expectOne('/app/inspection/4');
        expect(req.request.method).toBe('PUT');
        req.flush({});
        expect(router.navigate).toHaveBeenCalledWith(['/staff/assessments', 9]);
    });

    it('should do nothing when the confirmation is cancelled', () => {
        // A dismissed dialog completes without a value
        dialogs.open$.mockReturnValue(EMPTY);
        service.assignInspection(inspection);
        http.expectNone('/app/inspection/4');
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should show why taking the inspection failed and stay', () => {
        dialogs.open$.mockReturnValue(of(true));
        service.assignInspection(inspection);
        http.expectOne('/app/inspection/4').flush('taken already', { status: 403, statusText: 'Forbidden' });
        expect(toast.error).toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should show a statement in a dialog', () => {
        service.showStatement({ comment: 'Clear language' });
        expect(modal.openRef).toHaveBeenCalled();
        expect(statement()).toBe('Clear language');
    });
});
