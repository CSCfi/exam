// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { of, throwError } from 'rxjs';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { CalendarComponent } from './calendar.component';
import { CalendarService } from './calendar.service';

describe('CalendarComponent', () => {
    let component: CalendarComponent;
    let fixture: ComponentFixture<CalendarComponent>;
    const toast = { error: vi.fn() };
    const router = { navigate: vi.fn() };
    const dialogs = { open$: vi.fn(() => of(true)) };
    let calendar: Record<string, ReturnType<typeof vi.fn>>;

    const room = { id: 3, localTimezone: 'Europe/Helsinki' } as ExamRoom;
    const in10Days = DateTime.now().plus({ days: 10 }).toISO();
    const examInfo = () => ({
        name: 'Maths',
        duration: 60,
        periodStart: '2000-01-01T00:00:00Z',
        periodEnd: in10Days,
        examSections: [
            { id: 2, sequenceNumber: 1, optional: true },
            { id: 1, sequenceNumber: 0, optional: false },
            { id: 3, sequenceNumber: 2, optional: true },
        ],
    });

    const create = (query: Record<string, string | string[]> = {}, data: object = {}) => {
        TestBed.overrideProvider(ActivatedRoute, {
            useValue: {
                snapshot: {
                    data,
                    paramMap: convertToParamMap({ id: '5' }),
                    queryParamMap: convertToParamMap(query),
                },
            },
        });
        fixture = TestBed.createComponent(CalendarComponent);
        component = fixture.componentInstance;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        calendar = {
            getExamInfo$: vi.fn(() => of(examInfo())),
            getReservationiWindowSize$: vi.fn(() => of({ value: 30 })),
            getExamVisitSupportStatus$: vi.fn(() => of({ isExamVisitSupported: true })),
            getCurrentEnrolment$: vi.fn(() => of({ optionalSections: [{ id: 3 }] })),
            reserve$: vi.fn(() => of(undefined)),
        };
        TestBed.configureTestingModule({
            imports: [CalendarComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                { provide: ToastService, useValue: toast },
                { provide: Router, useValue: router },
                { provide: ConfirmationDialogService, useValue: dialogs },
                { provide: CalendarService, useValue: calendar },
                { provide: ActivatedRoute, useValue: {} },
            ],
        });
        TestBed.overrideComponent(CalendarComponent, { set: { imports: [], template: '' } });
    });

    it('should load the exam with its sections in order and the earlier choices selected', () => {
        create({ selected: ['2'] });

        expect(calendar.getExamInfo$).toHaveBeenCalledWith(false, 5);
        expect(component.isInteroperable()).toBe(true);
        expect(component.examInfo().examSections.map((es) => [es.id, es.selected])).toEqual([
            [1, undefined],
            [2, true],
            [3, true],
        ]);
    });

    it('should load a collaborative exam from IOP', () => {
        create({ isCollaborative: 'true' });
        expect(calendar.getExamInfo$).toHaveBeenCalledWith(true, 5);
    });

    it('should show errors but still open the page', () => {
        calendar.getReservationiWindowSize$.mockReturnValue(throwError(() => 'i18n_error'));
        create();

        expect(toast.error).toHaveBeenCalledWith('i18n_error');
        expect(component.examInfo().name).toBe('Maths');
    });

    it('should allow booking from today until the window or the period ends', () => {
        create();

        const today = DateTime.now();
        expect(DateTime.fromJSDate(component.minDate()).hasSame(today, 'day')).toBe(true);
        expect(DateTime.fromJSDate(component.maxDate()).toISO()).toBe(in10Days);
    });

    it('should number the steps by the optional parts shown', () => {
        create();
        expect(component.getSequenceNumber('room')).toBe(3);
        expect(component.getSequenceNumber('confirmation')).toBe(4);
    });

    describe('reserving', () => {
        const pick = () =>
            component.createReservation({
                start: '2030-06-12T07:00:00Z',
                end: '2030-06-12T09:00:00Z',
                room,
                accessibilities: [],
            });

        it('should show the chosen time in the room zone', () => {
            create();
            pick();
            expect(component.reservation()?.time).toBe('12.06.2030 10:00 - 12:00');
        });

        it('should reserve with the selected sections and go to the dashboard', () => {
            create();
            pick();

            component.confirmReservation();

            const args = calendar.reserve$.mock.calls[0];
            expect(args[0]).toBe(5);
            expect(args[4]).toEqual([]);
            expect(args[5]).toEqual({ _id: null });
            expect(args[7]).toEqual([3]);
            expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
            expect(component.confirming()).toBe(false);
        });

        it('should require a section to take', () => {
            calendar.getExamInfo$.mockReturnValue(
                of({ ...examInfo(), examSections: [{ id: 2, sequenceNumber: 0, optional: true }] }),
            );
            calendar.getCurrentEnrolment$.mockReturnValue(of(null));
            create();
            pick();

            component.confirmReservation();

            expect(calendar.reserve$).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith('i18n_select_at_least_one_section');
        });

        it('should show why reserving failed and allow trying again', () => {
            calendar.reserve$.mockReturnValue(throwError(() => 'i18n_error_reservation_overlap'));
            create();
            pick();

            component.confirmReservation();

            expect(toast.error).toHaveBeenCalledWith('i18n_error_reservation_overlap');
            expect(router.navigate).not.toHaveBeenCalled();
            expect(component.confirming()).toBe(false);
        });

        it('should reserve in the chosen organisation', () => {
            create();
            component.setOrganisation({ _id: 'org-1' } as never);
            pick();

            component.confirmReservation();
            expect(calendar.reserve$.mock.calls[0][5]).toEqual({ _id: 'org-1' });
        });

        it('should forget the choices when the section selection turns invalid', () => {
            create();
            component.setOrganisation({ _id: 'org-1' } as never);
            pick();

            component.onSectionSelection({ valid: false });

            expect(component.reservation()).toBeUndefined();
            expect(component.selectedOrganisation()).toBeUndefined();
        });
    });

    it('should move to external booking after confirmation, keeping the sections', () => {
        create({ selected: ['2'] });

        component.makeExternalReservation();

        expect(router.navigate).toHaveBeenCalledWith(['/calendar', 5, 'external'], {
            queryParams: { selected: [2, 3], isCollaborative: false },
        });
    });
});
