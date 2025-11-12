// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, LowerCasePipe, NgClass, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbCollapse, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Exam } from 'src/app/exam/exam.model';
import { ArchiveDownloadComponent } from 'src/app/review/listing/dialogs/archive-download.component';
import { ReviewListService } from 'src/app/review/listing/review-list.service';
import type { Review, ReviewListView } from 'src/app/review/review.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { DiffInDaysPipe } from 'src/app/shared/date/day-diff.pipe';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { FileService } from 'src/app/shared/file/file.service';
import { PageFillPipe } from 'src/app/shared/paginator/page-fill.pipe';
import { PaginatorComponent } from 'src/app/shared/paginator/paginator.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';

@Component({
    selector: 'xm-rl-in-progress',
    templateUrl: './in-progress.component.html',
    imports: [
        NgbPopover,
        FormsModule,
        RouterLink,
        TableSortComponent,
        NgClass,
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
export class InProgressReviewsComponent {
    exam = input.required<Exam>();
    reviews = input<Review[]>([]);
    collaborative = input(false);
    view = signal<ReviewListView | undefined>(undefined);

    private modal = inject(ModalService);
    private ReviewList = inject(ReviewListService);
    private Session = inject(SessionService);
    private Files = inject(FileService);

    constructor() {
        effect(() => this.init(this.reviews()));
    }

    isOwner(user: User) {
        const currentExam = this.exam();
        return currentExam && currentExam.examOwners.some((o) => o.id === user.id);
    }

    showId() {
        return this.Session.getUser().isAdmin && this.exam()?.anonymous;
    }

    pageSelected(event: { page: number }) {
        this.view.update((v) => ({ ...v!, page: event.page }));
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

    setPredicate(predicate: string) {
        this.view.update((v) => {
            if (!v) return v;
            const reverse = v.predicate === predicate ? !v.reverse : v.reverse;
            return { ...v, predicate, reverse };
        });
    }

    toggleView() {
        this.view.update((v) => ({ ...v!, toggle: !v!.toggle }));
    }

    getAnswerAttachments() {
        const currentExam = this.exam();
        return this.modal
            .open$<{ $value: { start: string; end: string } }>(ArchiveDownloadComponent)
            .subscribe((params) =>
                this.Files.download(
                    `/app/exam/${currentExam.id}/attachments`,
                    `${currentExam.id}.tar.gz`,
                    params.$value,
                ),
            );
    }

    private init(reviews: Review[]) {
        const initialView = this.ReviewList.prepareView(reviews, (r) => r, 'examParticipation.deadline');
        this.view.set(initialView);
    }
}
