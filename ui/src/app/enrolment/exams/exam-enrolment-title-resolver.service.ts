import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ExamEnrolmentTitleResolverService implements Resolve<string> {
    resolve(route: ActivatedRouteSnapshot) {
        return `EXAM - enrolment #${route.params.id}`;
    }
}
