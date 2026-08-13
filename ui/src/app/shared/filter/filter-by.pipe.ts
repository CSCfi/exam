// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

@Pipe({
    name: 'filterBy',
})
export class FilterByPipe implements PipeTransform {
    transform<T>(items: T[], filterFn: (item: T) => boolean): T[] {
        if (!items || !filterFn) {
            return items;
        }

        return items.filter(filterFn);
    }
}
