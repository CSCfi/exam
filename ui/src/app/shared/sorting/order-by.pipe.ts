// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { PipeTransform } from '@angular/core';
import { Injectable, Pipe } from '@angular/core';
import { path } from 'src/app/shared/miscellaneous/helpers';
@Pipe({
    name: 'orderBy',
})
@Injectable({ providedIn: 'root' })
export class OrderByPipe implements PipeTransform {
    transform<T>(input: T[], path: string, reverse = false, lowercase = true): T[] {
        return input.length < 2 ? input : input.sort((a, b) => this.compare(reverse, lowercase, a, b, path));
    }

    compare<T>(reverse: boolean, lowercase: boolean, a: T, b: T, property: string): number {
        const f1 = path(property.split('.'), a);
        const f2 = path(property.split('.'), b);

        // Handle null/undefined values - sort them to the end
        if (f1 == null && f2 == null) return 0;
        if (f1 == null) return reverse ? -1 : 1;
        if (f2 == null) return reverse ? 1 : -1;

        // Type mismatch handling - numbers before strings
        if (typeof f1 === 'number' && typeof f2 === 'string') {
            return reverse ? 1 : -1;
        }
        if (typeof f1 === 'string' && typeof f2 === 'number') {
            return reverse ? -1 : 1;
        }

        // String comparison with optional lowercase
        if (lowercase && typeof f1 === 'string' && typeof f2 === 'string') {
            const order = f1.toLowerCase() < f2.toLowerCase() ? -1 : 1;
            return reverse ? -order : order;
        }

        // Standard comparison for same types
        if (f1 < f2) {
            return reverse ? 1 : -1;
        }
        if (f1 > f2) {
            return reverse ? -1 : 1;
        }

        return 0;
    }
}
