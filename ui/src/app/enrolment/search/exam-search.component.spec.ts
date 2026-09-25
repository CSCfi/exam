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
import { ExamSearchComponent } from './exam-search.component';

describe('ExamSearchComponent', () => {
    let fixture: ComponentFixture<ExamSearchComponent>;
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

    const exam = {
        id: 1,
        name: 'BYOD exam',
        implementation: 'CLIENT_AUTH',
        course: { code: 'ABC', name: 'Course' },
        periodStart: '2026-01-01T00:00:00Z',
        periodEnd: '2099-01-01T00:00:00Z',
        examLanguages: [{ code: 'fi', name: 'suomi' }],
        examinationEventConfigurations: [{ id: 55, examinationEvent: { start: '2099-01-01T10:00:00Z' } }],
    };

    // The flow hops through promise-based modal results, so let the microtask queue drain
    const settle = async () => {
        for (let i = 0; i < 20; i++) await Promise.resolve();
        await fixture.whenStable();
    };

    const buttonFor = (label: string) =>
        Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
            (b as HTMLButtonElement).textContent?.includes(label),
        ) as HTMLButtonElement | undefined;

    const cardText = () => fixture.nativeElement.textContent as string;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ExamSearchComponent, TranslateModule.forRoot()],
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
        fixture = TestBed.createComponent(ExamSearchComponent);
        fixture.detectChanges();
        await settle();

        // Permission check being active lists the exams without a search term
        http.expectOne('/app/settings/enrolmentPermissionCheck').flush({ active: true });
        await settle();
        http.expectOne((r) => r.url === '/app/student/exams').flush([exam]);
        await settle();
        http.expectOne('/app/enrolments/exam/1').flush([]);
        await settle();
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

    // Enrols, then picks an examination event that turns out to be full
    const enrolAndPickFullEvent = async () => {
        buttonFor('i18n_enroll_to_exam')!.click();
        await settle();
        http.expectOne('/app/enrolments/exam/1').flush([]);
        await settle();
        http.expectOne('/app/enrolments/1').flush({ id: 7 });
        await settle();
        http.expectOne('/app/enrolments/7/examination/55').flush('i18n_error_max_enrolments_reached', {
            status: 403,
            statusText: 'Forbidden',
        });
        await settle();
        // The card asks for the enrolment state it is in now
        http.expectOne('/app/enrolments/exam/1').flush([
            { id: 7, reservation: null, examinationEventConfiguration: null },
        ]);
        await settle();
    };

    it('should show the exam as needing a time once the enrolment exists', async () => {
        expect(cardText()).not.toContain('i18n_state_needs_reservation_title');

        await enrolAndPickFullEvent();

        expect(cardText()).toContain('i18n_state_needs_reservation_title');
        expect(buttonFor('i18n_enroll_to_exam')).toBeUndefined();
        expect(buttonFor('i18n_student_new_reservation')).toBeDefined();
    });

    it('should offer the examination event picker again from the reservation button', async () => {
        await enrolAndPickFullEvent();
        vi.clearAllMocks();

        buttonFor('i18n_student_new_reservation')!.click();
        await settle();
        http.expectOne('/app/enrolments/exam/1').flush([
            { id: 7, reservation: null, examinationEventConfiguration: null },
        ]);
        await settle();

        expect(modal.openRef).toHaveBeenCalledTimes(1);
        http.expectOne('/app/enrolments/7/examination/55').flush(null);
        await settle();
        // Picking a time that works refreshes the card once more
        http.expectOne('/app/enrolments/exam/1').flush([
            { id: 7, reservation: null, examinationEventConfiguration: { id: 55 } },
        ]);
        await settle();

        expect(toast.error).not.toHaveBeenCalled();
        expect(cardText()).toContain('i18n_enrolled_to_exam');
    });
});
