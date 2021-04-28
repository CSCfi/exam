/*
 * Copyright (c) 2018 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { Component, Input } from '@angular/core';

import { Exam } from '../../../exam/exam.model';
import { ExamService } from '../../../exam/exam.service';
import { SessionService } from '../../../session/session.service';
import { ReviewListService } from '../reviewList.service';

import type { Review } from '../../review.model';
import type { ReviewListView } from '../reviewList.service';
@Component({
    selector: 'rl-rejected',
    templateUrl: './rejected.component.html',
})
export class RejectedReviewsComponent {
    @Input() reviews: Review[] = [];
    @Input() exam: Exam;

    view: ReviewListView;

    constructor(private ReviewList: ReviewListService, private Exam: ExamService, private Session: SessionService) {}

    ngOnInit() {
        this.view = this.ReviewList.prepareView(this.reviews, this.handleGradedReviews, 'displayedGradingTime');
    }

    showId = () => this.Session.getUser().isAdmin && this.exam?.anonymous;

    applyFreeSearchFilter = () => (this.view.filtered = this.ReviewList.applyFilter(this.view.filter, this.view.items));

    pageSelected = (event: { page: number }) => (this.view.page = event.page);

    private translateGrade = (exam: Exam) => {
        const grade = exam.grade ? exam.grade.name : 'NONE';
        return this.Exam.getExamGradeDisplayName(grade);
    };

    handleGradedReviews = (r: Review) => {
        r.displayedGradingTime = r.examParticipation.exam.languageInspection
            ? r.examParticipation.exam.languageInspection.finishedAt
            : r.examParticipation.exam.gradedTime;
        r.displayedGrade = this.translateGrade(r.examParticipation.exam);
        r.displayedCredit = this.Exam.getExamDisplayCredit(r.examParticipation.exam);
    };

    setPredicate = (predicate: string) => {
        if (this.view.predicate === predicate) {
            this.view.reverse = !this.view.reverse;
        }
        this.view.predicate = predicate;
    };
}
