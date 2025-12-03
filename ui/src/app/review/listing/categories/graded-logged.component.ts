// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass, SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnChanges, SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
    NgbCollapse,
    NgbDropdown,
    NgbDropdownItem,
    NgbDropdownMenu,
    NgbDropdownToggle,
    NgbPopover,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
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
    selector: 'xm-rl-graded-logged',
    templateUrl: './graded-logged.component.html',
    imports: [
        NgbPopover,
        FormsModule,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        NgbCollapse,
        NgClass,
        TableSortComponent,
        RouterLink,
        PaginatorComponent,
        SlicePipe,
        DatePipe,
        TranslateModule,
        ApplyDstPipe,
        PageFillPipe,
        OrderByPipe,
    ],
    styleUrl: '../review-list.component.scss',
})
export class GradedLoggedReviewsComponent implements OnInit, OnChanges {
    @Input() reviews: Review[] = [];
    @Input() exam!: Exam;
    @Input() collaborative = false;
    @Output() archived = new EventEmitter<Review[]>();
    view!: ReviewListView;
    selections: { all: boolean; page: boolean } = { all: false, page: false };

    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private ReviewList = inject(ReviewListService);
    private Files = inject(FileService);
    private CommonExam = inject(CommonExamService);
    private Session = inject(SessionService);

    ngOnInit() {
        this.init();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.reviews) {
            this.init();
            this.applyFreeSearchFilter();
        }
    }

    applyFreeSearchFilter = () => (this.view.filtered = this.ReviewList.applyFilter(this.view.filter, this.view.items));

    showId = () => this.Session.getUser().isAdmin && this.exam?.anonymous;

    pageSelected = (event: { page: number }) => (this.view.page = event.page);

    setPredicate = (predicate: string) => {
        if (this.view.predicate === predicate) {
            this.view.reverse = !this.view.reverse;
        }
        this.view.predicate = predicate;
    };

    getLinkToAssessment = (review: Review) =>
        this.collaborative
            ? `/assessments/collaborative/${this.exam.id}/${review.examParticipation._id}`
            : `/assessments/${review.examParticipation.exam.id}`;

    archiveSelected = () => {
        const selection = this.ReviewList.getSelectedReviews(this.view.filtered);
        if (selection.length == 0) {
            return;
        }
        const ok = () => {
            this.archived.emit(selection);
            this.toast.info(this.translate.instant('i18n_exams_archived'));
        };
        const ids = selection.map((r) => r.examParticipation.exam.id);
        this.http.put('/app/reviews/archive', { ids: ids.join() }).subscribe(ok);
    };

    printSelected = (asReport: boolean) => {
        const selection = this.ReviewList.getSelectedReviews(this.view.filtered);
        if (selection.length == 0) {
            return;
        }
        let url = this.collaborative ? '/app/iop/reviews/' : '/app/exam/record/export/';
        if (asReport) {
            url += 'report/';
        }
        const fileType = asReport ? 'xlsx' : 'csv';
        const ids = selection.map((r) =>
            this.collaborative ? (r.examParticipation._id as string) : r.examParticipation.exam.id,
        );

        this.Files.download(
            url + this.exam.id,
            `${this.translate.instant('i18n_grading_info')}_${DateTime.now().toFormat('dd-MM-yyyy')}.${fileType}`,
            { childIds: ids.map((i) => i.toString()) },
            true,
        );
    };

    selectAll = () => this.ReviewList.selectAll(this.selections, this.view.filtered);

    selectPage = (selector: string) => this.ReviewList.selectPage(this.selections, this.view.filtered, selector);

    private init = () => {
        this.view = {
            ...this.ReviewList.prepareView(this.reviews, this.handleGradedReviews, 'examParticipation.started'),
            reverse: true,
        };
        this.selections = { all: false, page: false };
    };

    private translateGrade = (exam: Exam) => this.ReviewList.translateGrade(exam);

    private handleGradedReviews = (r: Review) => {
        r.displayedGradingTime = r.examParticipation.exam.languageInspection
            ? r.examParticipation.exam.languageInspection.finishedAt
            : r.examParticipation.exam.gradedTime;
        r.displayedGrade = this.translateGrade(r.examParticipation.exam);
        r.displayedCredit = this.CommonExam.getExamDisplayCredit(r.examParticipation.exam);
    };
}
