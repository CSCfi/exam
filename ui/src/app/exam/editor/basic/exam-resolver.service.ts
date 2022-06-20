import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { CollaborativeExamService } from '../../collaborative/collaborative-exam.service';
import { Exam } from '../../exam.model';
import { ExamService } from '../../exam.service';

@Injectable({ providedIn: 'root' })
export class ExamResolverService implements Resolve<Exam> {
    constructor(private Exam: ExamService, private CollaborativeExam: CollaborativeExamService) {}

    resolve(route: ActivatedRouteSnapshot): Observable<Exam> {
        const id = Number(route.paramMap.get('id'));
        const isCollab = !!route.queryParamMap.get('collaborative');
        return isCollab ? this.CollaborativeExam.download$(id) : this.Exam.downloadExam$(id);
    }
}
