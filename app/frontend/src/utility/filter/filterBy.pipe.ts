import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'filterBy',
})
export class FilterByPipe implements PipeTransform {
    transform(items: any[], filterFn: (item: any) => boolean) {
        if (!items || !filterFn) {
            return items;
        }

        return items.filter(filterFn);
    }
}
