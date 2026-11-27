// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

@Pipe({
    name: 'dayDiff',
})
export class DiffInDaysPipe implements PipeTransform {
    transform(from: string, to?: string): string {
        const msInDay = 1000 * 60 * 60 * 24;
        const end = to ? new Date(to) : new Date();
        const diff = (new Date(from).getTime() - end.getTime()) / msInDay;
        if (diff < 0) {
            return '<span class="text-danger">' + Math.floor(diff) + '</span>';
        }
        return '<span>' + Math.floor(diff) + '</span>';
    }
}
