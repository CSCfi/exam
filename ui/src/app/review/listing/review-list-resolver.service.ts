import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import { ExamParticipation } from 'src/app/exam/exam.model';
import { ReviewListService } from './review-list.service';

@Injectable()
export class ReviewListResolverService implements Resolve<ExamParticipation[]> {
    constructor(private ReviewList: ReviewListService, private ExamTab: ExamTabService) {}

    resolve(route: ActivatedRouteSnapshot): Observable<ExamParticipation[]> {
        const id = this.ExamTab.getExam()?.id || route.pathFromRoot[3].params.id; // hacky yes
        const isCollab = this.ExamTab.isCollaborative() || !!route.queryParamMap.get('collaborative');
        return this.ReviewList.getReviews$(id, isCollab);
    }
}
