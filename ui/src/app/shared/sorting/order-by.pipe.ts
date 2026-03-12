// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { path as getPath } from 'src/app/shared/miscellaneous/helpers';

@Pipe({
    name: 'orderBy',
})
export class OrderByPipe implements PipeTransform {
    transform<T>(input: T[], predicate: string, reverse = false, lowercase = true): T[] {
        if (input.length < 2) return input;
        const keys = predicate.split('.');
        return [...input].sort((a, b) => this.compare(reverse, lowercase, a, b, keys));
    }

    compare<T>(reverse: boolean, lowercase: boolean, a: T, b: T, keys: string[]): number {
        const f1 = getPath(keys, a);
        const f2 = getPath(keys, b);

        if (f1 == null && f2 == null) return 0;
        if (f1 == null) return reverse ? -1 : 1;
        if (f2 == null) return reverse ? 1 : -1;

        if (typeof f1 === 'number' && typeof f2 === 'string') return reverse ? 1 : -1;
        if (typeof f1 === 'string' && typeof f2 === 'number') return reverse ? -1 : 1;

        if (lowercase && typeof f1 === 'string' && typeof f2 === 'string') {
            const order = f1.toLowerCase().localeCompare(f2.toLowerCase());
            return reverse ? -order : order;
        }

        if (f1 < f2) return reverse ? 1 : -1;
        if (f1 > f2) return reverse ? -1 : 1;
        return 0;
    }
}
