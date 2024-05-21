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
import { DatePipe, SlicePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Exam } from 'src/app/exam/exam.model';
import type { ReviewListView } from 'src/app/review/listing/review-list.service';
import { ReviewListService } from 'src/app/review/listing/review-list.service';
import type { Review } from 'src/app/review/review.model';
import { SessionService } from 'src/app/session/session.service';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { DiffInDaysPipe } from 'src/app/shared/date/day-diff.pipe';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { PageFillPipe } from 'src/app/shared/paginator/page-fill.pipe';
import { PaginatorComponent } from 'src/app/shared/paginator/paginator.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';

@Component({
    selector: 'xm-rl-in-language-inspection',
    templateUrl: './in-language-inspection.component.html',
    standalone: true,
    imports: [
        FormsModule,
        TableSortComponent,
        RouterLink,
        PaginatorComponent,
        SlicePipe,
        DatePipe,
        TranslateModule,
        ApplyDstPipe,
        PageFillPipe,
        DiffInDaysPipe,
        OrderByPipe,
        NgbCollapse,
    ],
})
export class InLanguageInspectionReviewsComponent implements OnInit {
    @Input() reviews: Review[] = [];
    @Input() exam!: Exam;
    view!: ReviewListView;

    constructor(
        private ReviewList: ReviewListService,
        private Session: SessionService,
        private CommonExam: CommonExamService,
    ) {}

    ngOnInit() {
        this.view = this.ReviewList.prepareView(this.reviews, this.handleGradedReviews, 'examParticipation.deadline');
    }

    showId = () => this.Session.getUser().isAdmin && this.exam?.anonymous;

    applyFreeSearchFilter = () => (this.view.filtered = this.ReviewList.applyFilter(this.view.filter, this.view.items));

    pageSelected = (event: { page: number }) => {
        this.view.page = event.page;
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

    private handleGradedReviews = (r: Review) => {
        r.displayedGradingTime = r.examParticipation.exam.languageInspection
            ? r.examParticipation.exam.languageInspection.finishedAt
            : r.examParticipation.exam.gradedTime;
        r.displayedGrade = this.translateGrade(r.examParticipation.exam);
        r.displayedCredit = this.CommonExam.getExamDisplayCredit(r.examParticipation.exam);
    };
}
