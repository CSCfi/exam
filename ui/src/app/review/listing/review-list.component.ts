// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnChanges, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbModal, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamEnrolment, ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Exam } from 'src/app/exam/exam.model';
import type { Review } from 'src/app/review/review.model';
import { ArchivedReviewsComponent } from './categories/archived.component';
import { GradedLoggedReviewsComponent } from './categories/graded-logged.component';
import { GradedReviewsComponent } from './categories/graded.component';
import { InLanguageInspectionReviewsComponent } from './categories/in-language-inspection.component';
import { InProgressReviewsComponent } from './categories/in-progress.component';
import { RejectedReviewsComponent } from './categories/rejected.component';
import { AbortedExamsComponent } from './dialogs/aborted.component';
import { NoShowsComponent } from './dialogs/no-shows.component';
import { ReviewListService } from './review-list.service';

@Component({
    selector: 'xm-review-list',
    templateUrl: './review-list.component.html',
    imports: [
        NgbPopover,
        InProgressReviewsComponent,
        InLanguageInspectionReviewsComponent,
        GradedReviewsComponent,
        GradedLoggedReviewsComponent,
        RejectedReviewsComponent,
        ArchivedReviewsComponent,
        DatePipe,
        TranslateModule,
    ],
    styleUrl: './review-list.component.scss',
})
export class ReviewListComponent implements OnInit, OnChanges {
    exam!: Exam;
    collaborative = false;
    reviews: ExamParticipation[] = [];

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
        private route: ActivatedRoute,
        private ReviewList: ReviewListService,
        private Tabs: ExamTabService,
    ) {}

    ngOnInit() {
        this.route.data.subscribe((data) => {
            this.reviews = data.reviews;
            this.exam = this.Tabs.getExam();
            this.collaborative = this.Tabs.isCollaborative();
            this.refreshLists();
            this.http
                .get<ExamEnrolment[]>(`/app/noshows/${this.exam.id}`, { params: { collaborative: this.collaborative } })
                .subscribe((resp) => (this.noShows = resp));
            this.Tabs.notifyTabChange(5);
        });
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

    abortedExamsToBeFreed = (): number =>
        this.abortedExams.filter(
            (ae) =>
                ae.examParticipation.exam.trialCount &&
                ae.examParticipation.exam.examEnrolments.length > 0 &&
                ae.examParticipation.exam.examEnrolments[0].retrialPermitted === false,
        ).length;
}
