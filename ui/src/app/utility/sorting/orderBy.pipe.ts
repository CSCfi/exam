import { Injectable, Pipe } from '@angular/core';
import { get } from 'lodash';

import type { PipeTransform } from '@angular/core';

@Pipe({ name: 'orderBy' })
@Injectable({ providedIn: 'root' })
export class OrderByPipe implements PipeTransform {
    transform<T>(input: T[], path: string, reverse = false): T[] {
        return input.length < 2 ? input : input.sort((a, b) => this.compare(reverse, a, b, path));
    }

    compare<T>(reverse: boolean, a: T, b: T, path: string): number {
        const f1 = get(a, path);
        const f2 = get(b, path);
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
