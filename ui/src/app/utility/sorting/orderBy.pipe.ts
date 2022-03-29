import type { PipeTransform } from '@angular/core';
import { Injectable, Pipe } from '@angular/core';
import { get } from 'lodash';

@Pipe({ name: 'orderBy' })
@Injectable({ providedIn: 'root' })
export class OrderByPipe implements PipeTransform {
    transform<T>(input: T[], path: string, reverse = false, lowercase = true): T[] {
        return input.length < 2 ? input : input.sort((a, b) => this.compare(reverse, lowercase, a, b, path));
    }

    compare<T>(reverse: boolean, lowercase: boolean, a: T, b: T, path: string): number {
        const f1 = get(a, path);
        const f2 = get(b, path);
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
        if (f1 < f2 && reverse === false) {
            return -1;
        }
        if (f1 > f2 && reverse === false) {
            return 1;
        }
        if (f1 < f2 && reverse === true) {
            return 1;
        }
        if (f1 > f2 && reverse === true) {
            return -1;
        }
        return 0;
    }
}
