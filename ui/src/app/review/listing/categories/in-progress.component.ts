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
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { noop } from 'rxjs';
import type { Exam } from '../../../exam/exam.model';
import type { User } from '../../../session/session.service';
import { SessionService } from '../../../session/session.service';
import { FileService } from '../../../shared/file/file.service';
import type { Review } from '../../review.model';
import { ArchiveDownloadComponent } from '../dialogs/archive-download.component';
import type { ReviewListView } from '../review-list.service';
import { ReviewListService } from '../review-list.service';

@Component({
    selector: 'xm-rl-in-progress',
    templateUrl: './in-progress.component.html',
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
            .result.then((params) =>
                this.Files.download(`/app/exam/${this.exam.id}/attachments`, `${this.exam.id}.tar.gz`, params),
            )
            .catch(noop);
}
