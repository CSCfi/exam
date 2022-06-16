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
import { Component, Input, OnInit } from '@angular/core';
import type { Exam } from '../../../exam/exam.model';
import { SessionService } from '../../../session/session.service';
import { CommonExamService } from '../../../shared/miscellaneous/common-exam.service';
import type { Review } from '../../review.model';
import type { ReviewListView } from '../review-list.service';
import { ReviewListService } from '../review-list.service';

@Component({
    selector: 'xm-rl-archived',
    templateUrl: './archived.component.html',
})
export class ArchivedReviewsComponent implements OnInit {
    @Input() reviews: Review[] = [];
    @Input() exam!: Exam;

    view!: ReviewListView;

    constructor(
        private ReviewList: ReviewListService,
        private CommonExam: CommonExamService,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        this.view = {
            ...this.ReviewList.prepareView(this.reviews, this.handleGradedReviews, 'examParticipation.started'),
            reverse: true,
        };
    }

    showId = () => this.Session.getUser().isAdmin && this.exam?.anonymous;

    applyFreeSearchFilter = () => (this.view.filtered = this.ReviewList.applyFilter(this.view.filter, this.view.items));

    pageSelected = (event: { page: number }) => (this.view.page = event.page);

    handleGradedReviews = (r: Review) => {
        r.displayedGradingTime = r.examParticipation.exam.languageInspection
            ? r.examParticipation.exam.languageInspection.finishedAt
            : r.examParticipation.exam.gradedTime;
        r.displayedGrade = this.translateGrade(r.examParticipation.exam);
        r.displayedCredit = this.CommonExam.getExamDisplayCredit(r.examParticipation.exam);
    };

    setPredicate = (predicate: string) => {
        if (this.view.predicate === predicate) {
            this.view.reverse = !this.view.reverse;
        }
        this.view.predicate = predicate;
    };

    private translateGrade = (exam: Exam) => {
        const grade = exam.grade ? exam.grade.name : 'NONE';
        return this.CommonExam.getExamGradeDisplayName(grade);
    };
}
