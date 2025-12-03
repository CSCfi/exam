// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

@Pipe({
    name: 'minuteDiff',
    standalone: true,
})
export class DiffInMinutesPipe implements PipeTransform {
    transform(from: string, to: string): number {
        const diff = (new Date(to).getTime() - new Date(from).getTime()) / 1000 / 60;
        return Math.round(diff);
    }
}
