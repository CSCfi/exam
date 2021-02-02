import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterBy',
})
export class FilterByPipe implements PipeTransform {
    transform(items: unknown[], filterFn: (item: unknown) => boolean) {
        if (!items || !filterFn) {
            return items;
        }

        return items.filter(filterFn);
    }
}
