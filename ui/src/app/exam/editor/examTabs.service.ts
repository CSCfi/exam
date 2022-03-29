import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';

export type UpdateProps = {
    code: string | null;
    name: string | null;
    scaleChange: boolean;
    initScale: boolean;
};

@Injectable()
export class ExamTabService {
    public tabChange$: Observable<number>;
    private tabChangeSubscription = new Subject<number>();
    public examUpdate$: Observable<UpdateProps>;
    private examUpdateSubscription = new Subject<UpdateProps>();

    constructor() {
        this.tabChange$ = this.tabChangeSubscription.asObservable();
        this.examUpdate$ = this.examUpdateSubscription.asObservable();
    }

    notifyTabChange = (tab: number) => this.tabChangeSubscription.next(tab);
    notifyExamUpdate = (props: UpdateProps) => this.examUpdateSubscription.next(props);
}
