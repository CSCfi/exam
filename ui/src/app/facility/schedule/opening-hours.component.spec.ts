// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { ExamRoom } from 'src/app/reservation/reservation.model';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { OpenHoursComponent } from './opening-hours.component';

describe('OpenHoursComponent', () => {
    let component: OpenHoursComponent;
    let fixture: ComponentFixture<OpenHoursComponent>;
    let http: HttpTestingController;
    const toast = { info: vi.fn(), error: vi.fn() };

    const time = (hour: number, minute = 0) => ({ hour, minute, second: 0, millisecond: 0 });

    const room = (hours: { id: number; weekday: string; startTime: string; endTime: string }[]) =>
        ({ id: 1, name: 'Pegasus', defaultWorkingHours: hours }) as unknown as ExamRoom;

    const hours = () => component.extendedRoom()!.extendedDwh;

    const create = (r: ExamRoom) => {
        fixture = TestBed.createComponent(OpenHoursComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('room', r);
        fixture.detectChanges();
    };

    beforeEach(() => {
        vi.clearAllMocks();
        TestBed.configureTestingModule({
            imports: [OpenHoursComponent, TranslateModule.forRoot()],
            providers: [
                provideZonelessChangeDetection(),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ToastService, useValue: toast },
            ],
        });
        TestBed.inject(TranslateService).use('en');
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('should read the room hours into editable times', () => {
        create(room([{ id: 5, weekday: 'MONDAY', startTime: '8:00', endTime: '12:30' }]));

        expect(hours()[0]).toMatchObject({
            id: 5,
            editing: false,
            pickStartingTime: time(8),
            pickEndingTime: time(12, 30),
            displayEndingTime: time(12, 30),
        });
    });

    it('should order hours by weekday', () => {
        create(room([]));
        const days = ['SUNDAY', 'MONDAY', 'FRIDAY'].map((weekday) => ({ ...hours()[0], weekday }));

        expect(component.orderByWeekday(days as never).map((d) => d.weekday)).toEqual(['MONDAY', 'FRIDAY', 'SUNDAY']);
    });

    describe('adding hours', () => {
        beforeEach(() => create(room([{ id: 5, weekday: 'MONDAY', startTime: '8:00', endTime: '12:00' }])));

        const add = (weekday: string, start: ReturnType<typeof time>, end: ReturnType<typeof time>) => {
            component.updateNewTime(weekday);
            component.newTime.update((t) => ({ ...t, pickStartingTime: start, pickEndingTime: end }));
            component.updateHours(component.newTime());
        };

        it('should save them and add them to the list', () => {
            add('TUESDAY', time(9), time(15, 5));

            const req = http.expectOne('/app/workinghours');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({
                workingHours: { startTime: '9:00', endTime: '15:05', weekday: 'TUESDAY' },
                roomIds: [1],
            });
            req.flush({ id: 6 });

            expect(hours().map((h) => [h.id, h.weekday])).toEqual([
                [5, 'MONDAY'],
                [6, 'TUESDAY'],
            ]);
            expect(component.newTime().weekday).toBe('MONDAY');
            expect(toast.info).toHaveBeenCalled();
        });

        it('should refuse hours overlapping others on the same day', () => {
            add('MONDAY', time(11), time(14));

            http.expectNone('/app/workinghours');
            expect(toast.error).toHaveBeenCalledWith('i18n_time_overlaps_error');
        });

        it('should allow the same time on another day', () => {
            add('TUESDAY', time(8), time(12));
            http.expectOne('/app/workinghours').flush({ id: 6 });
        });

        it('should refuse a start after the end', () => {
            add('TUESDAY', time(14), time(9));

            http.expectNone('/app/workinghours');
            expect(toast.error).toHaveBeenCalledWith('i18n_starting_cannot_be_after_ending');
        });
    });

    describe('editing hours', () => {
        beforeEach(() => create(room([{ id: 5, weekday: 'MONDAY', startTime: '8:00', endTime: '12:00' }])));

        const edit = (start: ReturnType<typeof time>, end: ReturnType<typeof time>) => {
            const wh = { ...hours()[0], pickStartingTime: start, pickEndingTime: end };
            component.extendedRoom.update((r) => (r ? { ...r, extendedDwh: [wh] } : r));
            component.updateHours(wh);
        };

        it('should replace them in the list', () => {
            edit(time(9), time(11));
            http.expectOne('/app/workinghours').flush({ id: 7 });

            expect(hours().map((h) => [h.id, h.displayStartingTime.hour, h.editing])).toEqual([[7, 9, false]]);
        });

        it('should leave removing overlapped hours to the save', () => {
            edit(time(9), time(11));
            http.expectOne('/app/workinghours').flush({ id: 7 });

            http.expectNone('/app/workinghours/1/5');
        });

        it('should remove the old hours when the new ones do not overlap them', () => {
            edit(time(13), time(15));
            http.expectOne('/app/workinghours').flush({ id: 7 });

            const req = http.expectOne('/app/workinghours/1/5');
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
            expect(hours().map((h) => h.id)).toEqual([7]);
        });

        it('should remove the old hours when the new ones only touch them', () => {
            edit(time(12), time(15));
            http.expectOne('/app/workinghours').flush({ id: 7 });

            http.expectOne('/app/workinghours/1/5').flush(null);
        });
    });

    it('should delete hours', () => {
        create(room([{ id: 5, weekday: 'MONDAY', startTime: '8:00', endTime: '12:00' }]));

        component.deleteHours(hours()[0]);
        const req = http.expectOne('/app/workinghours/1/5');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);

        expect(hours()).toEqual([]);
    });

    describe('picking a new time', () => {
        beforeEach(() => create(room([])));

        it('should move the end forward with a later start', () => {
            component.updateNewTimePickEnding(time(10));
            component.updateNewTimePickStarting(time(11));

            expect(component.newTime().pickEndingTime).toEqual(time(11));
        });

        it('should move the start back with an earlier end', () => {
            component.updateNewTimePickStarting(time(0));
            component.updateNewTimePickEnding(time(10));
            component.updateNewTimePickStarting(time(9));
            component.updateNewTimePickEnding(time(8));

            expect(component.newTime().pickStartingTime).toEqual(time(8));
        });
    });

    it('should format times with two digits', () => {
        create(room([]));
        expect(component.workingHourFormat(time(8, 5))).toBe('08:05');
    });
});
