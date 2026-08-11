// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { vi } from 'vitest';
import { ExaminationEventSearchComponent } from './examination-event-search.component';

// The pickers hand over the instants of local midnight either side of the range, and the backend
// compares them against examinationEvent.start as instants. They must therefore travel untouched:
// adjusting them by the browser's UTC offset used to drag the range earlier by that offset, three
// hours in Helsinki summer, so the search picked up the previous evening and lost the last one.
describe('ExaminationEventSearchComponent (date range parameters)', () => {
    let fixture: ComponentFixture<ExaminationEventSearchComponent>;
    let component: ExaminationEventSearchComponent;
    let httpMock: HttpTestingController;

    const EVENTS_URL = '/app/examinationevents';
    const expectQuery = () => httpMock.expectOne((r) => r.url === EVENTS_URL);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ExaminationEventSearchComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ConfirmationDialogService, useValue: { open$: vi.fn() } },
                { provide: EnrolmentService, useValue: { removeAllEventEnrolmentConfigs$: vi.fn() } },
                { provide: ToastrService, useValue: { info: vi.fn(), error: vi.fn() } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ExaminationEventSearchComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);

        // The constructor queries once with today's default range.
        expectQuery().flush([]);
    });

    afterEach(() => httpMock.verify());

    it('should send the selected days as their local midnight instants', () => {
        component.endDateChanged({ date: new Date(2026, 7, 20, 9, 30, 0, 0) });
        expectQuery().flush([]);

        component.startDateChanged({ date: new Date(2026, 7, 11, 13, 45, 0, 0) });
        const req = expectQuery();

        // Start of 11 August locally, and the midnight that closes 20 August.
        expect(req.request.params.get('start')).toBe(new Date(2026, 7, 11, 0, 0, 0, 0).toISOString());
        expect(req.request.params.get('end')).toBe(new Date(2026, 7, 21, 0, 0, 0, 0).toISOString());
        req.flush([]);
    });

    it('should not shift the range by the browser offset', () => {
        component.startDateChanged({ date: new Date(2026, 7, 11, 13, 45, 0, 0) });
        const req = expectQuery();

        const sent = new Date(req.request.params.get('start') as string);
        expect(sent.getHours()).toBe(0);
        expect(sent.getMinutes()).toBe(0);
        req.flush([]);
    });
});
