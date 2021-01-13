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

@Component({
    selector: 'review-list',
    template: require('./reviewList.template.html'),
})
export class ReviewListComponent {
    @Input() exam: Exam;
    @Input() collaborative: boolean;
    @Input() reviews: ExamParticipation[];

    private noShows: ExamEnrolment[];
    private abortedExams: ExamParticipation[];
    public inProgressReviews: ExamParticipation[];
    private gradedReviews: ExamParticipation[];
    private gradedLoggedReviews: ExamParticipation[];
    private archivedReviews: ExamParticipation[];
    public languageInspectedReviews: ExamParticipation[];
    public rejectedReviews: ExamParticipation[];

    constructor(private modal: NgbModal, private http: HttpClient) {}

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
        this.abortedExams = this.filterByState(['ABORTED']);
        this.inProgressReviews = this.filterByState(['REVIEW', 'REVIEW_STARTED']);
        this.gradedReviews = this.reviews.filter(
            r => r.exam.state === 'GRADED' && (!r.exam.languageInspection || r.exam.languageInspection.finishedAt),
        );
        this.gradedLoggedReviews = this.filterByState(['GRADED_LOGGED']);
        this.archivedReviews = this.filterByState(['ARCHIVED']);
        this.languageInspectedReviews = this.reviews.filter(
            r => r.exam.state === 'GRADED' && r.exam.languageInspection && !r.exam.languageInspection.finishedAt,
        );
        this.rejectedReviews = this.filterByState(['REJECTED']);
    };

    filterByState = (states: string[]) => this.reviews.filter(r => states.indexOf(r.exam.state) > -1);

    onArchive = (reviews: ExamParticipation[]) => {
        const ids = reviews.map(r => r.id);
        const archived = this.gradedLoggedReviews.filter(glr => ids.indexOf(glr.id) > -1);
        this.archivedReviews = this.archivedReviews.concat(archived);
        this.gradedLoggedReviews = this.gradedLoggedReviews.filter(glr => ids.indexOf(glr.id) === -1);
    };

    onRegistration = (
        reviews: (ExamParticipation & { selected: boolean; displayedGradingTime: Date | undefined })[],
    ) => {
        reviews.forEach(r => {
            const index = this.gradedReviews.map(gr => gr.id).indexOf(r.id);
            this.gradedReviews.splice(index, 1);
            r.selected = false;
            r.displayedGradingTime = r.exam.languageInspection
                ? r.exam.languageInspection.finishedAt
                : r.exam.gradedTime;
            this.gradedLoggedReviews.push(r);
        });
        this.gradedReviews = angular.copy(this.gradedReviews);
        this.gradedLoggedReviews = angular.copy(this.gradedLoggedReviews);
    };

    openAborted = () => {
        this.modal.open({
            backdrop: 'static',
            keyboard: true,
            windowClass: 'question-editor-modal',
            component: 'abortedExams',
            resolve: {
                exam: this.exam,
                abortedExams: () => this.abortedExams,
            },
        });
    };

    openNoShows = () =>
        this.modal.open({
            backdrop: 'static',
            keyboard: true,
            windowClass: 'question-editor-modal',
            component: 'noShows',
            resolve: {
                noShows: () => this.noShows,
            },
        });
}
