import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import { Exam } from '../exam.model';

export type UpdateProps = {
    code: string | null;
    name: string | null;
    scaleChange: boolean;
    initScale: boolean;
};

@Injectable({ providedIn: 'root' })
export class ExamTabService {
    public tabChange$: Observable<number>;
    public examUpdate$: Observable<UpdateProps>;
    private tabChangeSubscription = new Subject<number>();
    private examUpdateSubscription = new Subject<UpdateProps>();
    private exam!: Exam;
    private collaborative = false;

    constructor() {
        this.tabChange$ = this.tabChangeSubscription.asObservable();
        this.examUpdate$ = this.examUpdateSubscription.asObservable();
    }

    notifyTabChange = (tab: number) => this.tabChangeSubscription.next(tab);
    notifyExamUpdate = (props: UpdateProps) => this.examUpdateSubscription.next(props);
    setExam = (exam: Exam) => (this.exam = exam);
    getExam = () => this.exam;
    setCollaborative = (collaborative: boolean) => (this.collaborative = collaborative);
    isCollaborative = () => this.collaborative;
}
