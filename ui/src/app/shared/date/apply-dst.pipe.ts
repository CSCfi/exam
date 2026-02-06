// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { PipeTransform } from '@angular/core';
import { Pipe, inject } from '@angular/core';
import { DateTime } from 'luxon';
import { DateTimeService } from './date.service';

@Pipe({
    name: 'applyDst',
    standalone: true,
})
export class ApplyDstPipe implements PipeTransform {
    private DateTimeService = inject(DateTimeService);

    transform = (input?: string): string => {
        if (!input) return '';
        const date = DateTime.fromISO(input);
        if (this.DateTimeService.isDST(date.toJSDate())) {
            return date.minus({ hours: 1 }).toISO() as string;
        }
        return input;
    };
}
