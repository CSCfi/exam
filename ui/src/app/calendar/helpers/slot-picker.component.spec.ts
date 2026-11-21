// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { HttpParams } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import type { EventApi } from '@fullcalendar/core';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { CalendarService } from 'src/app/calendar/calendar.service';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { SlotPickerComponent } from './slot-picker.component';

describe('SlotPickerComponent', () => {
    let component: SlotPickerComponent;
    let fixture: ComponentFixture<SlotPickerComponent>;
    const toast = { error: vi.fn() };
    let calendar: Record<string, ReturnType<typeof vi.fn>>;

    const room = (id: number, name: string, extra: Partial<ExamRoom> = {}) =>
        ({ id, name, localTimezone: 'Europe/Helsinki', ...extra }) as ExamRoom;

    beforeEach(() => {
        vi.clearAllMocks();
        calendar = {
            listAccessibilityCriteria$: vi.fn(() => of([{ id: 4, name: 'Aid' }])),
            listRooms$: vi.fn(() =>
                of([room(1, 'pegasus'), room(2, ''), room(3, 'Aquarium', { internalPasswordRequired: true })]),
            ),
            listMaintenancePeriods$: vi.fn(() => of([{ id: 1 }])),
            listSlots$: vi.fn(() => of([])),
            validatePassword$: vi.fn(() => of({ valid: true })),
        };
        TestBed.configureTestingModule({
            imports: [SlotPickerComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                { provide: ToastService, useValue: toast },
                { provide: CalendarService, useValue: calendar },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
            ],
        });
        TestBed.overrideComponent(SlotPickerComponent, { set: { imports: [], template: '' } });
        fixture = TestBed.createComponent(SlotPickerComponent);
        component = fixture.componentInstance;
    });

    it('should list the named rooms by name', () => {
        expect(component.rooms().map((r) => r.name)).toEqual(['Aquarium', 'pegasus']);
        expect(component.maintenancePeriods()).toEqual([{ id: 1, org: '' }]);
    });

    it('should list the rooms of a chosen organisation', () => {
        fixture.componentRef.setInput('organisation', {
            code: 'ORG',
            facilities: [room(9, 'Remote')],
            maintenancePeriods: [{ id: 2 }],
        });

        expect(component.rooms().map((r) => r.name)).toEqual(['Remote']);
        expect(component.maintenancePeriods()).toEqual([
            { id: 1, org: '' },
            { id: 2, org: 'ORG' },
        ]);
    });

    describe('choosing a room', () => {
        it('should open a room without a password at once', () => {
            component.selectRoom(component.rooms()[1]);
            expect(component.selectedRoom()?.id).toBe(1);
            expect(component.passwordVerified()).toBe(true);
            expect(component.rooms()[1].filtered).toBe(true);
        });

        it('should ask for the password first and check it', () => {
            component.selectRoom(component.rooms()[0]);
            expect(component.passwordVerified()).toBe(false);

            component.onPasswordValidated('secret');

            expect(calendar.validatePassword$).toHaveBeenCalledWith(3, 'secret', false, undefined);
            expect(component.passwordVerified()).toBe(true);
        });

        it('should tell about a wrong password', () => {
            calendar.validatePassword$.mockReturnValue(throwError(() => 'nope'));
            component.selectRoom(component.rooms()[0]);

            component.onPasswordValidated('wrong');

            expect(component.passwordVerified()).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('i18n_invalid_password');
        });

        it('should not open a room out of service', () => {
            component.selectRoom({ ...room(7, 'Broken', { outOfService: true }), filtered: false });
            expect(component.selectedRoom()).toBeUndefined();
        });
    });

    describe('slots', () => {
        const refresh = () => {
            const success = vi.fn();
            component.refresh({ date: '2030-06-12T00:00:00+03:00', timeZone: 'Europe/Helsinki', success });
            return success;
        };

        it('should ask nothing before a room is chosen', () => {
            refresh();
            expect(calendar.listSlots$).not.toHaveBeenCalled();
        });

        it('should fetch the week with the chosen aids and show what is free', () => {
            component.accesibilitiesChanged([{ id: 4, name: 'Aid', filtered: true }]);
            component.selectRoom(component.rooms()[1]);
            calendar.listSlots$.mockReturnValue(
                of([
                    { start: '2030-06-12T08:00:00+03:00', end: '2030-06-12T09:00:00+03:00', availableMachines: 2 },
                    { start: '2030-06-12T09:00:00+03:00', end: '2030-06-12T10:00:00+03:00', availableMachines: 0 },
                    {
                        start: '2030-06-12T10:00:00+03:00',
                        end: '2030-06-12T11:00:00+03:00',
                        availableMachines: -1,
                        conflictingExam: true,
                    },
                ]),
            );

            const success = refresh();

            const [external, collaborative, chosen, examId, params] = calendar.listSlots$.mock.calls[0];
            expect([external, collaborative, chosen.id, examId]).toEqual([false, false, 1, 5]);
            expect((params as HttpParams).get('day')).toBe('2030-06-10');
            expect((params as HttpParams).getAll('aids')).toEqual(['4']);
            expect(
                success.mock.calls[0][0].map((e: { title: string; backgroundColor: string }) => [
                    e.title,
                    e.backgroundColor,
                ]),
            ).toEqual([
                ['i18n_slot_available (2)', '#a6e9b2'],
                ['i18n_reserved', '#92c3e4'],
                ['i18n_own_reservation', '#fc3858'],
            ]);
            expect(success.mock.calls[0][0][0].start).toEqual(new Date('2030-06-12T05:00:00Z'));
        });

        it('should ask a remote room by organisation', () => {
            fixture.componentRef.setInput('isExternal', true);
            fixture.componentRef.setInput('organisation', {
                _id: 'org-1',
                code: 'ORG',
                facilities: [room(9, 'Remote', { _id: 'facility-1' })],
            });
            component.selectRoom(component.rooms()[0]);

            refresh();

            const params = calendar.listSlots$.mock.calls[0][4] as HttpParams;
            expect(params.get('org')).toBe('org-1');
            expect(params.get('date')).toBe('2030-06-10');
        });

        it('should show why slots could not be fetched', () => {
            calendar.listSlots$.mockReturnValue(throwError(() => 'i18n_error'));
            component.selectRoom(component.rooms()[1]);

            refresh();
            expect(toast.error).toHaveBeenCalledWith('i18n_error');
        });
    });

    it('should pass on the picked slot with the room and aids', () => {
        const picked = vi.fn();
        component.selected.subscribe(picked);
        component.accesibilitiesChanged([{ id: 4, name: 'Aid', filtered: true }]);
        component.selectRoom(component.rooms()[1]);

        component.eventSelected({ startStr: 'a', endStr: 'b' } as EventApi);

        expect(picked).toHaveBeenCalledWith({
            start: 'a',
            end: 'b',
            room: expect.objectContaining({ id: 1 }),
            accessibilities: [{ id: 4, name: 'Aid', filtered: true }],
        });
    });
});
