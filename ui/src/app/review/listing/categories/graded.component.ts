// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass, SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
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
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import type { Exam } from 'src/app/exam/exam.model';
import { AssessmentService } from 'src/app/review/assessment/assessment.service';
import { ReviewListService } from 'src/app/review/listing/review-list.service';
import type { Review, ReviewListView } from 'src/app/review/review.model';
import { SessionService } from 'src/app/session/session.service';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { DiffInDaysPipe } from 'src/app/shared/date/day-diff.pipe';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import { PageFillPipe } from 'src/app/shared/paginator/page-fill.pipe';
import { PaginatorComponent } from 'src/app/shared/paginator/paginator.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';

@Component({
    selector: 'xm-rl-graded',
    templateUrl: './graded.component.html',
    standalone: true,
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
        DiffInDaysPipe,
        OrderByPipe,
    ],
    styleUrl: '../review-list.component.scss',
})
export class GradedReviewsComponent implements OnInit, OnChanges {
    @Input() exam!: Exam;
    @Input() reviews: Review[] = [];
    @Input() collaborative = false;
    @Output() registered = new EventEmitter<Review[]>();
    view!: ReviewListView;
    needsFeedbackWarning = false;
    selections: { all: boolean; page: boolean } = { all: false, page: false };

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
        private Confirmation: ConfirmationDialogService,
        private ReviewList: ReviewListService,
        private Assessment: AssessmentService,
        private CommonExam: CommonExamService,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        this.init();
        if (!this.exam.examFeedbackConfig) {
            this.needsFeedbackWarning = false;
        } else {
            this.http
                .get<{ status: 'nothing' | 'everything' }>(`/app/review/${this.exam.id}/locked`)
                .subscribe((setting) => (this.needsFeedbackWarning = setting.status === 'everything'));
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.reviews) {
            this.init();
            this.applyFreeSearchFilter();
        }
    }

    showId = () => this.Session.getUser().isAdmin && this.exam?.anonymous;

    applyFreeSearchFilter = () => (this.view.filtered = this.ReviewList.applyFilter(this.view.filter, this.view.items));

    sendSelectedToRegistry = () => {
        const selection = this.ReviewList.getSelectedReviews(this.view.filtered);
        if (selection.length == 0) {
            return;
        }
        const content = this.Assessment.getRecordReviewConfirmationDialogContent('', this.needsFeedbackWarning);
        const examId = this.collaborative ? this.exam.id : undefined;
        this.Confirmation.open$(this.translate.instant('i18n_confirm'), content).subscribe({
            next: () =>
                forkJoin(selection.map((s) => this.ReviewList.sendToRegistry$(s.examParticipation, examId))).subscribe(
                    () => {
                        this.registered.emit(selection);
                        this.toast.info(this.translate.instant('i18n_results_send_ok'));
                    },
                ),
        });
    };

    getLinkToAssessment = (review: Review) =>
        this.collaborative
            ? `/assessments/collaborative/${this.exam.id}/${review.examParticipation._id}`
            : `/assessments/${review.examParticipation.exam.id}`;

    pageSelected = (event: { page: number }) => (this.view.page = event.page);

    selectAll = () => this.ReviewList.selectAll(this.selections, this.view.filtered);

    selectPage = (selector: string) => this.ReviewList.selectPage(this.selections, this.view.filtered, selector);

    setPredicate = (predicate: string) => {
        if (this.view.predicate === predicate) {
            this.view.reverse = !this.view.reverse;
        }
        this.view.predicate = predicate;
    };

    private init() {
        this.view = this.ReviewList.prepareView(this.reviews, this.handleGradedReviews, 'examParticipation.deadline');
        this.selections = { all: false, page: false };
    }

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
