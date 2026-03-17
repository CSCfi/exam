// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, SlicePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgbCollapse, NgbDropdownModule, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Exam } from 'src/app/exam/exam.model';
import { ReviewListService } from 'src/app/review/listing/review-list.service';
import type { Review } from 'src/app/review/review.model';
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
        NgbDropdownModule,
        NgbCollapse,
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
    readonly exam = input.required<Exam>();
    readonly reviews = input<Review[]>([]);
    readonly collaborative = input(false);
    readonly archived = output<Review[]>();

    readonly view = linkedSignal(() => ({
        ...this.ReviewList.prepareView(this.reviews(), (r) => this.handleGradedReviews(r), 'examParticipation.started'),
        reverse: true,
    }));
    readonly selections = linkedSignal<{ all: boolean; page: boolean }>(() => {
        void this.reviews();
        return { all: false, page: false };
    });
    readonly needsFeedbackWarning = signal(false);

    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly ReviewList = inject(ReviewListService);
    private readonly Files = inject(FileService);
    private readonly CommonExam = inject(CommonExamService);
    private readonly Session = inject(SessionService);

    constructor() {
        toObservable(this.exam)
            .pipe(
                switchMap((exam) =>
                    exam.examFeedbackConfig
                        ? this.http
                              .get<{ status: 'nothing' | 'everything' }>(`/app/review/${exam.id}/locked`)
                              .pipe(map((s) => s.status === 'everything'))
                        : of(false),
                ),
                takeUntilDestroyed(),
            )
            .subscribe((v) => this.needsFeedbackWarning.set(v));
    }

    updateFilter(value: string) {
        this.view.update((v) => ({
            ...v,
            filter: value,
            filtered: this.ReviewList.applyFilter(value, v.items),
        }));
    }

    applyFreeSearchFilter() {
        this.view.update((v) => ({
            ...v,
            filtered: this.ReviewList.applyFilter(v.filter, v.items),
        }));
    }

    showId() {
        return this.Session.getUser().isAdmin && this.exam()?.anonymous;
    }

    pageSelected(event: { page: number }) {
        this.view.update((v) => ({ ...v, page: event.page }));
    }

    setPredicate(predicate: string) {
        this.view.update((v) => {
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
        const selection = this.ReviewList.getSelectedReviews(this.view().filtered);
        if (selection.length == 0) {
            return;
        }
        const ok = () => {
            this.archived.emit(selection);
            this.toast.info(this.translate.instant('i18n_exams_archived'));
        };
        const ids = selection.map((r) => r.examParticipation.exam.id);
        this.http.put<void>('/app/reviews/archive', { ids: ids.join() }).subscribe(ok);
    }

    printSelected(asReport: boolean) {
        const selection = this.ReviewList.getSelectedReviews(this.view().filtered);
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
            { params: { ids: ids }, method: 'POST' },
        );
    }

    selectAll() {
        const currentSelections = { ...this.selections() };
        this.ReviewList.selectAll(currentSelections, this.view().filtered);
        this.selections.set(currentSelections);
    }

    selectPage(selector: string) {
        const currentSelections = { ...this.selections() };
        this.ReviewList.selectPage(currentSelections, this.view().filtered, selector);
        this.selections.set(currentSelections);
    }

    toggleView() {
        this.view.update((v) => ({ ...v, toggle: !v.toggle }));
    }

    onReviewToggle = (review: Review, event: Event) => {
        review.selected = (event.target as HTMLInputElement).checked;
    };

    onFreeSearchFilterInput = (event: Event) => {
        this.updateFilter((event.target as HTMLInputElement).value);
        this.applyFreeSearchFilter();
    };

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
