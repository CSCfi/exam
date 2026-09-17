// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { interceptors } from 'src/app/interceptors';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { vi } from 'vitest';
import { ExamSearchResultComponent } from './exam-search-result.component';

describe('ExamSearchResultComponent', () => {
    let fixture: ComponentFixture<ExamSearchResultComponent>;
    let http: HttpTestingController;

    const toast = { error: vi.fn(), success: vi.fn(), info: vi.fn() };
    // Stands in for the examination event picker, always picking the first event on offer
    const modal = {
        openRef: vi.fn(() => ({
            componentInstance: {
                exam: { set: vi.fn() },
                enrolmentId: { set: vi.fn() },
                existingEventId: { set: vi.fn() },
            },
        })),
        result$: vi.fn(() => of({ id: 55 })),
    };

    // A BYOD exam with two upcoming examination events, the first of which is full
    const exam = {
        id: 1,
        name: 'BYOD exam',
        implementation: 'CLIENT_AUTH',
        course: { code: 'ABC', name: 'Course' },
        periodStart: '2026-01-01T00:00:00Z',
        periodEnd: '2099-01-01T00:00:00Z',
        examLanguages: [],
        languages: [],
        examinationEventConfigurations: [
            { id: 55, examinationEvent: { start: '2099-01-01T10:00:00Z' } },
            { id: 56, examinationEvent: { start: '2099-02-01T10:00:00Z' } },
        ],
        alreadyEnrolled: false,
        reservationMade: false,
    };

    // The flow hops through promise-based modal results, so let the microtask queue drain
    const settle = async () => {
        for (let i = 0; i < 20; i++) await Promise.resolve();
        await fixture.whenStable();
    };

    const enrolButton = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    const full = (request: string) =>
        http.expectOne(request).flush('i18n_error_max_enrolments_reached', { status: 403, statusText: 'Forbidden' });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ExamSearchResultComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(withInterceptors(interceptors)),
                provideHttpClientTesting(),
                provideRouter([]),
                { provide: ToastrService, useValue: toast },
                { provide: ModalService, useValue: modal },
            ],
        }).compileComponents();
        TestBed.inject(TranslateService).use('fi');
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(ExamSearchResultComponent);
        fixture.componentRef.setInput('exam', exam);
        fixture.detectChanges();
        await settle();
        // Course code rendering asks for its prefix, that is none of this spec's business
        http.match('/app/settings/coursecodeprefix').forEach((r) => r.flush({ prefix: '' }));
    });

    afterEach(() => {
        vi.clearAllMocks();
        try {
            http.verify();
        } finally {
            TestBed.resetTestingModule();
        }
    });

    it('should keep the enrol button usable when the picked examination event is full', async () => {
        expect(enrolButton().disabled).toBe(false);

        enrolButton().click();
        await settle();
        http.expectOne('/app/enrolments/exam/1').flush([]);
        await settle();
        http.expectOne('/app/enrolments/1').flush({ id: 7 });
        await settle();
        full('/app/enrolments/7/examination/55');
        await settle();

        expect(toast.error).toHaveBeenCalledWith('i18n_error_max_enrolments_reached');
        expect(enrolButton().disabled).toBe(false);
    });

    it('should reopen the examination event picker for an enrolment that has no time yet', async () => {
        enrolButton().click();
        await settle();
        http.expectOne('/app/enrolments/exam/1').flush([
            { id: 7, reservation: null, examinationEventConfiguration: null },
        ]);
        await settle();

        expect(modal.openRef).toHaveBeenCalledTimes(1);
        http.expectOne('/app/enrolments/7/examination/55').flush(null);
        await settle();

        expect(toast.error).not.toHaveBeenCalled();
        expect(enrolButton().disabled).toBe(false);
    });

    it('should report an enrolment that already has a time as such', async () => {
        enrolButton().click();
        await settle();
        http.expectOne('/app/enrolments/exam/1').flush([
            { id: 7, reservation: { id: 3 }, examinationEventConfiguration: null },
        ]);
        await settle();

        expect(modal.openRef).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('i18n_already_enrolled');
        expect(enrolButton().disabled).toBe(false);
    });
});
