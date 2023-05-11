import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class CalendarTitleResolverService implements Resolve<string> {
    resolve(route: ActivatedRouteSnapshot) {
        return `EXAM - book a reservation for exam #${route.params.id}`;
    }
}
