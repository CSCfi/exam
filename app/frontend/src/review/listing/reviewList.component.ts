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

import { ExamEnrolment } from '../../enrolment/enrolment.model';
import { Exam, ExamParticipation } from '../../exam/exam.model';
import { Review } from '../review.model';
import { AbortedExamsComponent } from './dialogs/abortedExams.component';
import { NoShowsComponent } from './dialogs/noShows.component';
import { ReviewListService } from './reviewList.service';

@Component({
    selector: 'review-list',
    templateUrl: './reviewList.component.html',
})
export class ReviewListComponent {
    @Input() exam: Exam;
    @Input() collaborative: boolean;
    @Input() reviews: ExamParticipation[];

    noShows: ExamEnrolment[];
    abortedExams: Review[];
    inProgressReviews: Review[];
    gradedReviews: Review[];
    gradedLoggedReviews: Review[];
    archivedReviews: Review[];
    languageInspectedReviews: Review[];
    rejectedReviews: Review[];

    constructor(private modal: NgbModal, private http: HttpClient, private ReviewList: ReviewListService) {}

    ngOnInit() {
        // No-shows
        if (this.collaborative) {
            //TODO: Fetch collaborative no-shows from xm.
            this.noShows = [];
        } else {
            this.http.get<ExamEnrolment[]>(`/app/noshows/${this.exam.id}`).subscribe(resp => (this.noShows = resp));
        }
    }

    ngOnChanges = () => {
        this.abortedExams = this.filterByState(['ABORTED'], this.reviews);
        this.inProgressReviews = this.filterByState(['REVIEW', 'REVIEW_STARTED'], this.reviews);
        this.gradedReviews = this.filterByState(
            ['GRADED'],
            this.reviews.filter(r => !r.exam.languageInspection || r.exam.languageInspection.finishedAt),
        );
        this.gradedLoggedReviews = this.filterByState(['GRADED_LOGGED'], this.reviews);
        this.archivedReviews = this.filterByState(['ARCHIVED'], this.reviews);
        this.languageInspectedReviews = this.filterByState(
            ['GRADED'],
            this.reviews.filter(
                r => r.exam.state === 'GRADED' && r.exam.languageInspection && !r.exam.languageInspection.finishedAt,
            ),
        );
        this.rejectedReviews = this.filterByState(['REJECTED'], this.reviews);
    };

    private diffInMinutes = (from: string, to: string) => {
        const diff = (new Date(to).getTime() - new Date(from).getTime()) / 1000 / 60;
        return Math.round(diff);
    };

    filterByState = (states: string[], reviews: ExamParticipation[]): Review[] =>
        reviews
            .filter(r => states.indexOf(r.exam.state) > -1)
            .map(r => ({
                examParticipation: r,
                grades: [],
                displayName: this.ReviewList.getDisplayName(r, this.collaborative),
                duration: this.diffInMinutes(r.started, r.ended).toString(),
                isUnderLanguageInspection: (r.exam.languageInspection &&
                    !r.exam.languageInspection.finishedAt) as boolean,
                selected: false,
            }));

    onArchive = (reviews: Review[]) => {
        const ids = reviews.map(r => r.examParticipation.id);
        const archived = this.gradedLoggedReviews.filter(glr => ids.indexOf(glr.examParticipation.id) > -1);
        this.archivedReviews = this.archivedReviews.concat(archived);
        this.gradedLoggedReviews = this.gradedLoggedReviews.filter(glr => ids.indexOf(glr.examParticipation.id) === -1);
    };

    onRegistration = (reviews: Review[]) => {
        reviews.forEach(r => {
            const index = this.gradedReviews.map(gr => gr.examParticipation.id).indexOf(r.examParticipation.id);
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
        });
        modalRef.componentInstance.exam = this.exam;
        modalRef.componentInstance.abortedExams = this.abortedExams;
    };

    openNoShows = () => {
        const modalRef = this.modal.open(NoShowsComponent, {
            backdrop: 'static',
            keyboard: true,
            windowClass: 'question-editor-modal',
        });
        modalRef.componentInstance.noShows = this.noShows;
    };
}
