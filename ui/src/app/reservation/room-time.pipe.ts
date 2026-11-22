// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { DateTime } from 'luxon';

type RoomReservation = {
    startAt: string;
    endAt: string;
    externalReservation?: { roomTz?: string } | null;
    machine?: { room?: { localTimezone?: string } | null } | null;
};

/** The zone of the room a reservation is in, or undefined (this browser's zone) when it is not known. */
export const reservationZone = (r: RoomReservation): string | undefined =>
    r.externalReservation?.roomTz || r.machine?.room?.localTimezone || undefined;

/**
 * A reservation's start or end on the room's clock: the student has to be there at that time, wherever the
 * viewer is. Takes Luxon format tokens: dd, MM, yyyy, HH and mm are as in Angular's date pipe, but a month name
 * is LLL (Luxon's MMM gives a number in Finnish).
 */
@Pipe({ name: 'roomTime' })
export class RoomTimePipe implements PipeTransform {
    private readonly locale = inject(LOCALE_ID);

    transform(r: RoomReservation | null | undefined, field: 'startAt' | 'endAt', format: string, locale?: string) {
        const value = r?.[field];
        if (!r || !value) return '';
        return DateTime.fromISO(value, { zone: reservationZone(r) })
            .setLocale(locale ?? this.locale)
            .toFormat(format);
    }
}
