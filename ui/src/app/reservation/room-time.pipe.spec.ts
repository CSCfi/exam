// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RoomTimePipe } from './room-time.pipe';

describe('RoomTimePipe', () => {
    let pipe: RoomTimePipe;
    // 23:30 - 00:30 in Tokyo, the next day there
    const times = { startAt: '2030-06-11T14:30:00Z', endAt: '2030-06-11T15:30:00Z' };

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [RoomTimePipe, { provide: LOCALE_ID, useValue: 'en' }] });
        pipe = TestBed.inject(RoomTimePipe);
    });

    it('should show a reservation on the clock of its room', () => {
        const r = { ...times, machine: { room: { localTimezone: 'Asia/Tokyo' } } };

        expect(pipe.transform(r, 'startAt', 'dd.MM.yyyy HH:mm')).toBe('11.06.2030 23:30');
        expect(pipe.transform(r, 'endAt', 'dd.MM.yyyy HH:mm')).toBe('12.06.2030 00:30');
    });

    it('should use the zone of a room at another organisation', () => {
        const r = { ...times, externalReservation: { roomTz: 'Asia/Tokyo' }, machine: null };

        expect(pipe.transform(r, 'endAt', 'dd LLL')).toBe('12 Jun');
        expect(pipe.transform(r, 'endAt', 'dd LLL', 'fi')).toBe('12 kesä');
    });

    it('should show nothing without a time', () => {
        expect(pipe.transform(undefined, 'startAt', 'HH:mm')).toBe('');
    });
});
