// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';
import { range } from 'ramda';

@Pipe({
    name: 'pageFill',
    standalone: true,
})
export class PageFillPipe implements PipeTransform {
    transform = (input: number[], total: number, current: number, pageSize: number): number[] => {
        const pages = Math.floor(total / pageSize);
        if (pages > 0 && current === pages) {
            const amount = (pages + 1) * pageSize - total;
            return input.concat(range(0, amount));
        }
        return input;
    };
}
