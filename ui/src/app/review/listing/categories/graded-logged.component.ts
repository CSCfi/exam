// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass, SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradedLoggedReviewsComponent {
    reviews = input<Review[]>([]);
    exam = input.required<Exam>();
    collaborative = input(false);
    archived = output<Review[]>();

    view = signal<ReviewListView | undefined>(undefined);
    selections = signal<{ all: boolean; page: boolean }>({ all: false, page: false });
    needsFeedbackWarning = signal(false);

    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private ReviewList = inject(ReviewListService);
    private Files = inject(FileService);
    private CommonExam = inject(CommonExamService);
    private Session = inject(SessionService);

    constructor() {
        effect(() => this.init(this.reviews()));

        effect(() => {
            const currentExam = this.exam();
            if (!currentExam.examFeedbackConfig) {
                this.needsFeedbackWarning.set(false);
            } else {
                this.http
                    .get<{ status: 'nothing' | 'everything' }>(`/app/review/${currentExam.id}/locked`)
                    .subscribe((setting) => this.needsFeedbackWarning.set(setting.status === 'everything'));
            }
        });
    }

    updateFilter(value: string) {
        this.view.update((v) => {
            if (!v) return v;
            return {
                ...v,
                filter: value,
                filtered: this.ReviewList.applyFilter(value, v.items),
            };
        });
    }

    applyFreeSearchFilter() {
        const currentView = this.view();
        if (!currentView) return;
        this.view.update((v) => ({
            ...v!,
            filtered: this.ReviewList.applyFilter(v!.filter, v!.items),
        }));
    }

    showId() {
        return this.Session.getUser().isAdmin && this.exam()?.anonymous;
    }

    pageSelected(event: { page: number }) {
        this.view.update((v) => ({ ...v!, page: event.page }));
    }

    setPredicate(predicate: string) {
        this.view.update((v) => {
            if (!v) return v;
            const reverse = v.predicate === predicate ? !v.reverse : v.reverse;
            return { ...v, predicate, reverse };
        });
    }

    getLinkToAssessment(review: Review) {
        return this.collaborative()
            ? `/assessments/collaborative/${this.exam().id}/${review.examParticipation._id}`
            : `/assessments/${review.examParticipation.exam.id}`;
    }

    archiveSelected() {
        const currentView = this.view();
        if (!currentView) return;
        const selection = this.ReviewList.getSelectedReviews(currentView.filtered);
        if (selection.length == 0) {
            return;
        }
        const ok = () => {
            this.archived.emit(selection);
            this.toast.info(this.translate.instant('i18n_exams_archived'));
        };
        const ids = selection.map((r) => r.examParticipation.exam.id);
        this.http.put('/app/reviews/archive', { ids: ids.join() }).subscribe(ok);
    }

    printSelected(asReport: boolean) {
        const currentView = this.view();
        if (!currentView) return;
        const selection = this.ReviewList.getSelectedReviews(currentView.filtered);
        if (selection.length == 0) {
            return;
        }
        let url = this.collaborative() ? '/app/iop/reviews/' : '/app/exam/record/export/';
        if (asReport) {
            url += 'report/';
        }
        const fileType = asReport ? 'xlsx' : 'csv';
        const ids = selection.map((r) =>
            this.collaborative() ? (r.examParticipation._id as string) : r.examParticipation.exam.id,
        );

        this.Files.download(
            url + this.exam().id,
            `${this.translate.instant('i18n_grading_info')}_${DateTime.now().toFormat('dd-MM-yyyy')}.${fileType}`,
            { ids: ids },
            true,
        );
    }

    selectAll() {
        const currentView = this.view();
        if (!currentView) return;
        const currentSelections = { ...this.selections() };
        this.ReviewList.selectAll(currentSelections, currentView.filtered);
        this.selections.set(currentSelections);
    }

    selectPage(selector: string) {
        const currentView = this.view();
        if (!currentView) return;
        const currentSelections = { ...this.selections() };
        this.ReviewList.selectPage(currentSelections, currentView.filtered, selector);
        this.selections.set(currentSelections);
    }

    toggleView() {
        this.view.update((v) => ({ ...v!, toggle: !v!.toggle }));
    }

    private init(reviews: Review[]) {
        const initialView = {
            ...this.ReviewList.prepareView(reviews, (r) => this.handleGradedReviews(r), 'examParticipation.started'),
            reverse: true,
        };
        this.view.set(initialView);
        this.selections.set({ all: false, page: false });
    }

    private translateGrade(exam: Exam) {
        return this.ReviewList.translateGrade(exam);
    }

    private handleGradedReviews(r: Review) {
        r.displayedGradingTime = r.examParticipation.exam.languageInspection
            ? r.examParticipation.exam.languageInspection.finishedAt
            : r.examParticipation.exam.gradedTime;
        r.displayedGrade = this.translateGrade(r.examParticipation.exam);
        r.displayedCredit = this.CommonExam.getExamDisplayCredit(r.examParticipation.exam);
    }
}
