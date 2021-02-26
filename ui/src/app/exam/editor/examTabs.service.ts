import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';

@Injectable()
export class ExamTabService {
    public tabChange$: Observable<number>;
    private tabChangeSubscription = new Subject<number>();

    constructor() {
        this.tabChange$ = this.tabChangeSubscription.asObservable();
    }

    notifyTabChange = (tab: number) => this.tabChangeSubscription.next(tab);
}
