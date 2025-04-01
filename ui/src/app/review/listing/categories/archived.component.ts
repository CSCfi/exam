// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass, SlicePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbCollapse, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import type { Exam } from 'src/app/exam/exam.model';
import { ReviewListService } from 'src/app/review/listing/review-list.service';
import type { Review, ReviewListView } from 'src/app/review/review.model';
import { SessionService } from 'src/app/session/session.service';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { FileService } from 'src/app/shared/file/file.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { PageFillPipe } from 'src/app/shared/paginator/page-fill.pipe';
import { PaginatorComponent } from 'src/app/shared/paginator/paginator.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';

@Component({
    selector: 'xm-rl-archived',
    templateUrl: './archived.component.html',
    standalone: true,
    imports: [
        FormsModule,
        NgClass,
        NgbDropdownModule,
        TableSortComponent,
        RouterLink,
        PaginatorComponent,
        SlicePipe,
        DatePipe,
        TranslateModule,
        ApplyDstPipe,
        PageFillPipe,
        OrderByPipe,
        NgbCollapse,
    ],
    styleUrl: '../review-list.component.scss',
})
export class ArchivedReviewsComponent implements OnInit {
    @Input() reviews: Review[] = [];
    @Input() exam!: Exam;
    @Input() collaborative = false;

    view!: ReviewListView;
    selections: { all: boolean; page: boolean } = { all: false, page: false };

    constructor(
        private ReviewList: ReviewListService,
        private CommonExam: CommonExamService,
        private Files: FileService,
        private Session: SessionService,
        private Translate: TranslateService,
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

    selectAll = () => this.ReviewList.selectAll(this.selections, this.view.filtered);

    selectPage = (selector: string) => this.ReviewList.selectPage(this.selections, this.view.filtered, selector);

    printSelected = () => {
        const selection = this.ReviewList.getSelectedReviews(this.view.filtered);
        if (selection.length == 0) {
            return;
        }
        const url = this.collaborative ? '/app/iop/reviews/report/' : '/app/exam/record/export/report/';
        const ids = selection.map((r) =>
            this.collaborative ? (r.examParticipation._id as string) : r.examParticipation.exam.id,
        );

        this.Files.download(
            url + this.exam.id,
            `${this.Translate.instant('i18n_grading_info')}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`,
            { childIds: ids.map((i) => i.toString()) },
            true,
        );
    };

    private translateGrade = (exam: Exam) => {
        const grade = exam.grade ? exam.grade.name : 'NONE';
        return this.CommonExam.getExamGradeDisplayName(grade);
    };
}
