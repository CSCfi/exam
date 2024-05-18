// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, LowerCasePipe, NgClass, NgStyle, SlicePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbCollapse, NgbModal, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { noop } from 'rxjs';
import type { Exam } from 'src/app/exam/exam.model';
import { ArchiveDownloadComponent } from 'src/app/review/listing/dialogs/archive-download.component';
import type { ReviewListView } from 'src/app/review/listing/review-list.service';
import { ReviewListService } from 'src/app/review/listing/review-list.service';
import type { Review } from 'src/app/review/review.model';
import type { User } from 'src/app/session/session.service';
import { SessionService } from 'src/app/session/session.service';
import { ApplyDstPipe } from 'src/app/shared/date/apply-dst.pipe';
import { DiffInDaysPipe } from 'src/app/shared/date/day-diff.pipe';
import { FileService } from 'src/app/shared/file/file.service';
import { PageFillPipe } from 'src/app/shared/paginator/page-fill.pipe';
import { PaginatorComponent } from 'src/app/shared/paginator/paginator.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';

@Component({
    selector: 'xm-rl-in-progress',
    templateUrl: './in-progress.component.html',
    standalone: true,
    imports: [
        NgbPopover,
        FormsModule,
        RouterLink,
        TableSortComponent,
        NgClass,
        NgStyle,
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
})
export class InProgressReviewsComponent implements OnInit {
    @Input() exam!: Exam;
    @Input() reviews: Review[] = [];
    @Input() collaborative = false;
    view!: ReviewListView;

    constructor(
        private modal: NgbModal,
        private ReviewList: ReviewListService,
        private Session: SessionService,
        private Files: FileService,
    ) {}

    ngOnInit() {
        this.view = this.ReviewList.prepareView(this.reviews, (r) => r, 'examParticipation.deadline');
    }

    isOwner = (user: User) => this.exam && this.exam.examOwners.some((o) => o.id === user.id);

    showId = () => this.Session.getUser().isAdmin && this.exam?.anonymous;

    pageSelected = (event: { page: number }) => (this.view.page = event.page);

    applyFreeSearchFilter = () => (this.view.filtered = this.ReviewList.applyFilter(this.view.filter, this.view.items));

    setPredicate = (predicate: string) => {
        if (this.view.predicate === predicate) {
            this.view.reverse = !this.view.reverse;
        }
        this.view.predicate = predicate;
    };

    getAnswerAttachments = () =>
        this.modal
            .open(ArchiveDownloadComponent, {
                backdrop: 'static',
                keyboard: true,
            })
            .result.then((params: { $value: { start: string; end: string } }) =>
                this.Files.download(`/app/exam/${this.exam.id}/attachments`, `${this.exam.id}.tar.gz`, params.$value),
            )
            .catch(noop);
}
