// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, LowerCasePipe, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Exam } from 'src/app/exam/exam.model';
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
    selector: 'xm-rl-rejected',
    templateUrl: './rejected.component.html',
    imports: [
        TableSortComponent,
        RouterLink,
        PaginatorComponent,
        LowerCasePipe,
        SlicePipe,
        DatePipe,
        TranslateModule,
        ApplyDstPipe,
        PageFillPipe,
        DiffInDaysPipe,
        OrderByPipe,
        NgbCollapse,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RejectedReviewsComponent {
    readonly exam = input.required<Exam>();
    readonly reviews = input<Review[]>([]);

    readonly view = linkedSignal(() =>
        this.ReviewList.prepareView(this.reviews(), (r) => this.handleGradedReviews(r), 'displayedGradingTime'),
    );

    private readonly ReviewList = inject(ReviewListService);
    private readonly CommonExam = inject(CommonExamService);
    private readonly Session = inject(SessionService);

    showId() {
        return this.Session.getUser().isAdmin && this.exam()?.anonymous;
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

    pageSelected(event: { page: number }) {
        this.view.update((v) => ({ ...v, page: event.page }));
    }

    handleGradedReviews(r: Review) {
        r.displayedGradingTime = r.examParticipation.exam.languageInspection
            ? r.examParticipation.exam.languageInspection.finishedAt
            : r.examParticipation.exam.gradedTime;
        r.displayedGrade = this.translateGrade(r.examParticipation.exam);
        r.displayedCredit = this.CommonExam.getExamDisplayCredit(r.examParticipation.exam);
    }

    setPredicate(predicate: string) {
        this.view.update((v) => {
            const reverse = v.predicate === predicate ? !v.reverse : v.reverse;
            return { ...v, predicate, reverse };
        });
    }

    toggleView() {
        this.view.update((v) => ({ ...v, toggle: !v.toggle }));
    }

    onFreeSearchFilterInput = (event: Event) => {
        this.updateFilter((event.target as HTMLInputElement).value);
        this.applyFreeSearchFilter();
    };

    private translateGrade(exam: Exam) {
        return this.ReviewList.translateGrade(exam);
    }
}
