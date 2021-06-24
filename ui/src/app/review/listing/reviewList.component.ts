/*
 * Copyright (c) 2017 Exam Consortium
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
import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ExamTabService } from '../../exam/editor/examTabs.service';
import { Exam } from '../../exam/exam.model';
import { AbortedExamsComponent } from './dialogs/abortedExams.component';
import { NoShowsComponent } from './dialogs/noShows.component';
import { ReviewListService } from './reviewList.service';

import type { ExamEnrolment } from '../../enrolment/enrolment.model';
import type { ExamParticipation } from '../../exam/exam.model';
import type { Review } from '../review.model';
@Component({
    selector: 'review-list',
    templateUrl: './reviewList.component.html',
})
export class ReviewListComponent {
    @Input() exam: Exam;
    @Input() collaborative: boolean;
    @Input() reviews: ExamParticipation[] = [];

    noShows: ExamEnrolment[] = [];
    abortedExams: Review[] = [];
    inProgressReviews: Review[] = [];
    gradedReviews: Review[] = [];
    gradedLoggedReviews: Review[] = [];
    archivedReviews: Review[] = [];
    languageInspectedReviews: Review[] = [];
    rejectedReviews: Review[] = [];

    constructor(
        private modal: NgbModal,
        private http: HttpClient,
        private ReviewList: ReviewListService,
        private Tabs: ExamTabService,
    ) {}

    ngOnInit() {
        this.refreshLists();
        // No-shows
        if (this.collaborative) {
            //TODO: Fetch collaborative no-shows from xm.
            this.noShows = [];
        } else {
            this.http.get<ExamEnrolment[]>(`/app/noshows/${this.exam.id}`).subscribe((resp) => (this.noShows = resp));
        }
        this.Tabs.notifyTabChange(4);
    }

    ngOnChanges() {
        this.refreshLists();
    }

    refreshLists = () => {
        this.abortedExams = this.ReviewList.filterByStateAndEnhance(['ABORTED'], this.reviews, this.collaborative);
        this.inProgressReviews = this.ReviewList.filterByStateAndEnhance(
            ['REVIEW', 'REVIEW_STARTED'],
            this.reviews,
            this.collaborative,
        );
        this.gradedReviews = this.ReviewList.filterByStateAndEnhance(
            ['GRADED'],
            this.reviews.filter((r) => !r.exam.languageInspection || r.exam.languageInspection.finishedAt),
            this.collaborative,
        );
        this.gradedLoggedReviews = this.ReviewList.filterByStateAndEnhance(
            ['GRADED_LOGGED'],
            this.reviews,
            this.collaborative,
        );
        this.archivedReviews = this.ReviewList.filterByStateAndEnhance(['ARCHIVED'], this.reviews, this.collaborative);
        this.languageInspectedReviews = this.ReviewList.filterByStateAndEnhance(
            ['GRADED'],
            this.reviews.filter(
                (r) => r.exam.state === 'GRADED' && r.exam.languageInspection && !r.exam.languageInspection.finishedAt,
            ),
            this.collaborative,
        );
        this.rejectedReviews = this.ReviewList.filterByStateAndEnhance(['REJECTED'], this.reviews, this.collaborative);
    };

    onArchive = (reviews: Review[]) => {
        const ids = reviews.map((r) => r.examParticipation.id);
        const archived = this.gradedLoggedReviews.filter((glr) => ids.indexOf(glr.examParticipation.id) > -1);
        this.archivedReviews = this.archivedReviews.concat(archived);
        this.gradedLoggedReviews = this.gradedLoggedReviews.filter(
            (glr) => ids.indexOf(glr.examParticipation.id) === -1,
        );
    };

    onRegistration = (reviews: Review[]) => {
        reviews.forEach((r) => {
            const index = this.gradedReviews.map((gr) => gr.examParticipation.id).indexOf(r.examParticipation.id);
            this.gradedReviews.splice(index, 1);
            r.selected = false;
            r.displayedGradingTime = r.examParticipation.exam.languageInspection
                ? r.examParticipation.exam.languageInspection.finishedAt
                : r.examParticipation.exam.gradedTime;
            this.gradedLoggedReviews.push(r);
        });
        this.gradedReviews = Object.assign([], this.gradedReviews); // not sure if necessary to clone these
        this.gradedLoggedReviews = Object.assign([], this.gradedLoggedReviews);
    };

    openAborted = () => {
        const modalRef = this.modal.open(AbortedExamsComponent, {
            backdrop: 'static',
            keyboard: true,
            windowClass: 'question-editor-modal',
            size: 'xl',
        });
        modalRef.componentInstance.exam = this.exam;
        modalRef.componentInstance.abortedExams = this.abortedExams;
    };

    openNoShows = () => {
        const modalRef = this.modal.open(NoShowsComponent, {
            backdrop: 'static',
            keyboard: true,
            windowClass: 'question-editor-modal',
            size: 'xl',
        });
        modalRef.componentInstance.noShows = this.noShows;
    };
}
