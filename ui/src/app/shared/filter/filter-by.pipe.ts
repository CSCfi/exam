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
