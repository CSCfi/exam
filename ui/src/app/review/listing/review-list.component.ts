// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { ExamEnrolment, ExamParticipation } from 'src/app/enrolment/enrolment.model';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { Exam } from 'src/app/exam/exam.model';
import type { Review } from 'src/app/review/review.model';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewListComponent {
    exam = signal<Exam | undefined>(undefined);
    collaborative = signal(false);
    reviews = signal<ExamParticipation[]>([]);
    noShows = signal<ExamEnrolment[]>([]);

    // Computed signals that automatically update when reviews or collaborative change
    abortedExams = computed(() =>
        this.ReviewList.filterByStateAndEnhance(['ABORTED'], this.reviews(), this.collaborative()),
    );
    inProgressReviews = computed(() =>
        this.ReviewList.filterByStateAndEnhance(['REVIEW', 'REVIEW_STARTED'], this.reviews(), this.collaborative()),
    );
    languageInspectedReviews = computed(() =>
        this.ReviewList.filterByStateAndEnhance(
            ['GRADED'],
            this.reviews().filter(
                (r) => r.exam.state === 'GRADED' && r.exam.languageInspection && !r.exam.languageInspection.finishedAt,
            ),
            this.collaborative(),
        ),
    );
    rejectedReviews = computed(() =>
        this.ReviewList.filterByStateAndEnhance(['REJECTED'], this.reviews(), this.collaborative()),
    );

    // Mutable arrays that can be modified by user actions (onArchive, onRegistration)
    // These are synced from reviews() via effect() but can be modified by user actions
    gradedLoggedReviews = signal<Review[]>([]);
    archivedReviews = signal<Review[]>([]);
    gradedReviews = signal<Review[]>([]);

    private modal = inject(ModalService);
    private http = inject(HttpClient);
    private route = inject(ActivatedRoute);
    private ReviewList = inject(ReviewListService);
    private Tabs = inject(ExamTabService);

    constructor() {
        // Sync mutable arrays when reviews or collaborative changes
        effect(() => {
            // Sync arrays from computed values
            this.gradedLoggedReviews.set(
                this.ReviewList.filterByStateAndEnhance(['GRADED_LOGGED'], this.reviews(), this.collaborative()),
            );
            this.archivedReviews.set(
                this.ReviewList.filterByStateAndEnhance(['ARCHIVED'], this.reviews(), this.collaborative()),
            );
            this.gradedReviews.set(
                this.ReviewList.filterByStateAndEnhance(
                    ['GRADED'],
                    this.reviews().filter((r) => !r.exam.languageInspection || r.exam.languageInspection.finishedAt),
                    this.collaborative(),
                ),
            );
        });

        this.route.data.subscribe((data) => {
            this.reviews.set(data.reviews);
            const examValue = this.Tabs.getExam();
            if (!examValue) {
                throw new Error('Exam is required but not available');
            }
            const collaborativeValue = this.Tabs.isCollaborative();
            this.exam.set(examValue);
            this.collaborative.set(collaborativeValue);

            this.http
                .get<ExamEnrolment[]>(`/app/noshows/${examValue.id}`, { params: { collaborative: collaborativeValue } })
                .subscribe((resp) => this.noShows.set(resp));
            this.Tabs.notifyTabChange(5);
        });
    }

    onArchive(reviews: Review[]) {
        const ids = reviews.map((r) => r.examParticipation.id);
        const currentGradedLogged = this.gradedLoggedReviews();
        const archived = currentGradedLogged.filter((glr) => ids.indexOf(glr.examParticipation.id) > -1);
        this.archivedReviews.update((current) => [...current, ...archived]);
        this.gradedLoggedReviews.update((current) =>
            current.filter((glr) => ids.indexOf(glr.examParticipation.id) === -1),
        );
    }

    onRegistration(reviews: Review[]) {
        const currentGraded = this.gradedReviews();
        const currentGradedLogged = this.gradedLoggedReviews();
        const updatedGraded = [...currentGraded];
        const updatedGradedLogged = [...currentGradedLogged];

        reviews.forEach((r) => {
            const index = updatedGraded.findIndex((gr) => gr.examParticipation.id === r.examParticipation.id);
            if (index > -1) {
                updatedGraded.splice(index, 1);
            }
            r.selected = false;
            r.displayedGradingTime = r.examParticipation.exam.languageInspection
                ? r.examParticipation.exam.languageInspection.finishedAt
                : r.examParticipation.exam.gradedTime;
            updatedGradedLogged.push(r);
        });

        this.gradedReviews.set(updatedGraded);
        this.gradedLoggedReviews.set(updatedGradedLogged);
    }

    openAborted() {
        const modalRef = this.modal.openRef(AbortedExamsComponent, {
            windowClass: 'question-editor-modal',
            size: 'xl',
        });
        const currentExam = this.exam();
        if (currentExam) {
            modalRef.componentInstance.exam = currentExam;
            modalRef.componentInstance.abortedExams = this.abortedExams();
        }
    }

    openNoShows() {
        const modalRef = this.modal.openRef(NoShowsComponent, {
            windowClass: 'question-editor-modal',
            size: 'xl',
        });
        modalRef.componentInstance.noShows = this.noShows();
    }

    abortedExamsToBeFreed(): number {
        return this.abortedExams().filter(
            (ae) =>
                ae.examParticipation.exam.trialCount &&
                ae.examParticipation.exam.examEnrolments.length > 0 &&
                ae.examParticipation.exam.examEnrolments[0].retrialPermitted === false,
        ).length;
    }
}
