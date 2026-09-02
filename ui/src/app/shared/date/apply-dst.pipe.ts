// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { PipeTransform } from '@angular/core';
import { Pipe, inject } from '@angular/core';
import { DateTime } from 'luxon';
import { DateTimeService } from './date.service';

@Pipe({
    name: 'applyDst',
})
export class ApplyDstPipe implements PipeTransform {
    private readonly DateTimeService = inject(DateTimeService);

    // Timestamps arrive either as ISO strings (Ebean JSON) or as epoch millis (endpoints that build
    // their JSON by hand, e.g. /app/reviews/:id), so accept both instead of silently passing through.
    transform = (input?: string | number | Date): string => {
        if (!input) return '';
        const date = this.parse(input);
        if (!date.isValid) return '';
        if (this.DateTimeService.isDST(date.toJSDate())) {
            return date.minus({ hours: 1 }).toISO() as string;
        }
        return date.toISO() as string;
    };

    private parse = (input: string | number | Date): DateTime => {
        if (typeof input === 'number') return DateTime.fromMillis(input);
        if (input instanceof Date) return DateTime.fromJSDate(input);
        return DateTime.fromISO(input);
    };
}
