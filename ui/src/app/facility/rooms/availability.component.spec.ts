// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarService } from 'src/app/calendar/calendar.service';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { AvailabilityComponent } from './availability.component';

describe('AvailabilityComponent', () => {
    let component: AvailabilityComponent;
    let fixture: ComponentFixture<AvailabilityComponent>;
    let http: HttpTestingController;

    const day = new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString();
    const calendar = {
        processOpeningHours: vi.fn(() => []),
        getExceptionalAvailability: vi.fn(() => [
            { startDate: new Date().toISOString(), endDate: new Date().toISOString() },
            { startDate: day, endDate: day },
        ]),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [AvailabilityComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: CalendarService, useValue: calendar },
                { provide: ToastService, useValue: { info: vi.fn(), error: vi.fn() } },
            ],
        });
        // Only the component's own logic; the calendar it renders needs a session
        TestBed.overrideComponent(AvailabilityComponent, { set: { imports: [], template: '' } });
        http = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(AvailabilityComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('room', { id: 3, localTimezone: 'UTC' } as ExamRoom);
    });

    afterEach(() => http.verify());

    it('should colour slots by how full they are', () => {
        const slot = (reserved: number) => ({ start: '', end: '', total: 10, reserved });

        expect(component.getColor(slot(5))).toBe('#a6e9b2');
        expect(component.getColor(slot(9))).toBe('#8f8f8f');
        expect(component.getColor(slot(10))).toBe('#f50f35');
    });

    it('should leave out exceptions that ended over a year ago', () => {
        expect(component.exceptionHours().length).toBe(2);
        expect(component.newExceptions().length).toBe(1);
    });

    it('should fetch the week of the given day and show the slots in the room zone', () => {
        const success = vi.fn();

        component.refresh({ date: '2030-06-12', timeZone: 'UTC', success });
        http.expectOne('/app/availability/3/2030-06-10').flush([
            { start: '2030-06-12T08:00:00Z', end: '2030-06-12T09:00:00Z', total: 4, reserved: 1 },
        ]);

        expect(success).toHaveBeenCalledWith([
            expect.objectContaining({
                title: '1 / 4',
                start: new Date('2030-06-12T08:00:00Z'),
                end: new Date('2030-06-12T09:00:00Z'),
                color: '#a6e9b2',
            }),
        ]);
    });
});
