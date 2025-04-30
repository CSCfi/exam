// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { PipeTransform } from '@angular/core';
import { Injectable, Pipe } from '@angular/core';
import { path } from 'ramda';

@Pipe({
    name: 'orderBy',
    standalone: true,
})
@Injectable({ providedIn: 'root' })
export class OrderByPipe implements PipeTransform {
    transform<T>(input: T[], property: string | keyof T, reverse = false, lowercase = true): T[] {
        return input.length < 2 ? input : input.sort((a, b) => this.compare(reverse, lowercase, a, b, property));
    }

    compare<T>(reverse: boolean, lowercase: boolean, a: T, b: T, property: string | keyof T): number {
        const propertyPath = String(property).split('.');
        const f1 = path<T[keyof T]>(propertyPath, a);
        const f2 = path<T[keyof T]>(propertyPath, b);
        if (typeof f1 === 'number' && typeof f2 === 'string') {
            return reverse ? -1 : 1;
        }
        if (typeof f1 === 'string' && typeof f2 === 'number') {
            return reverse ? 1 : -1;
        }
        if (lowercase && typeof f1 === 'string' && typeof f2 === 'string') {
            const order = f1.toLowerCase() < f2.toLowerCase() ? -1 : 1;
            return reverse ? -order : order;
        }

        // Handle null/undefined values
        if (f1 == null && f2 == null) return 0;
        if (f1 == null) return reverse ? 1 : -1;
        if (f2 == null) return reverse ? -1 : 1;

        // Compare non-null values
        if (f1 < f2) return reverse ? 1 : -1;
        if (f1 > f2) return reverse ? -1 : 1;
        return 0;
    }
}
