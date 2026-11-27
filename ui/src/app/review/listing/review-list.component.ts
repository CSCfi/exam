// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
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
    readonly exam = signal<Exam | undefined>(undefined);
    readonly collaborative = signal(false);
    readonly reviews = signal<ExamParticipation[]>([]);
    readonly noShows = signal<ExamEnrolment[]>([]);

    // Computed signals that automatically update when reviews or collaborative change
    readonly abortedExams = computed(() =>
        this.ReviewList.filterByStateAndEnhance(['ABORTED'], this.reviews(), this.collaborative()),
    );
    readonly inProgressReviews = computed(() =>
        this.ReviewList.filterByStateAndEnhance(['REVIEW', 'REVIEW_STARTED'], this.reviews(), this.collaborative()),
    );
    readonly languageInspectedReviews = computed(() =>
        this.ReviewList.filterByStateAndEnhance(
            ['GRADED'],
            this.reviews().filter(
                (r) => r.exam.state === 'GRADED' && r.exam.languageInspection && !r.exam.languageInspection.finishedAt,
            ),
            this.collaborative(),
        ),
    );
    readonly rejectedReviews = computed(() =>
        this.ReviewList.filterByStateAndEnhance(['REJECTED'], this.reviews(), this.collaborative()),
    );

    // Mutable arrays synced from reviews() but writable for user actions (onArchive, onRegistration).
    // The { source, computation } form provides previous?.value so manually-moved items are preserved on re-sync.
    readonly gradedLoggedReviews = linkedSignal({
        source: () => ({ reviews: this.reviews(), collaborative: this.collaborative() }),
        computation: ({ reviews, collaborative }, previous): Review[] =>
            this.mergeAutoAndPreserved(
                this.ReviewList.filterByStateAndEnhance(['GRADED_LOGGED'], reviews, collaborative),
                previous?.value ?? [],
            ),
    });
    readonly archivedReviews = linkedSignal({
        source: () => ({ reviews: this.reviews(), collaborative: this.collaborative() }),
        computation: ({ reviews, collaborative }, previous): Review[] =>
            this.mergeAutoAndPreserved(
                this.ReviewList.filterByStateAndEnhance(['ARCHIVED'], reviews, collaborative),
                previous?.value ?? [],
            ),
    });
    readonly gradedReviews = linkedSignal({
        source: () => ({ reviews: this.reviews(), collaborative: this.collaborative() }),
        computation: ({ reviews, collaborative }) =>
            this.filterOutManuallyMoved(
                this.ReviewList.filterByStateAndEnhance(
                    ['GRADED'],
                    reviews.filter((r) => !r.exam.languageInspection || r.exam.languageInspection.finishedAt),
                    collaborative,
                ),
            ),
    });

    // Track manually moved review IDs
    private manuallyMovedIds = new Set<number | string>();

    private readonly modal = inject(ModalService);
    private readonly http = inject(HttpClient);
    private readonly route = inject(ActivatedRoute);
    private readonly ReviewList = inject(ReviewListService);
    private readonly Tabs = inject(ExamTabService);

    constructor() {
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
        const ids = reviews.map(this.getReviewId).filter((id): id is number | string => id !== undefined);
        const currentGradedLogged = this.gradedLoggedReviews();
        const archived = currentGradedLogged.filter((glr) => {
            const glrId = this.getReviewId(glr);
            return glrId !== undefined && ids.includes(glrId);
        });

        archived.forEach((r) => (r.selected = false));
        ids.forEach((id) => this.manuallyMovedIds.add(id));
        this.archivedReviews.update((current) => [...current, ...archived]);
        this.gradedLoggedReviews.update((current) =>
            current.filter((glr) => {
                const glrId = this.getReviewId(glr);
                return glrId === undefined || !ids.includes(glrId);
            }),
        );
    }

    onRegistration(reviews: Review[]) {
        const ids = reviews.map((r) => r.examParticipation.id).filter((id) => id !== undefined);
        reviews.forEach((r) => {
            r.selected = false;
            r.displayedGradingTime = r.examParticipation.exam.languageInspection
                ? r.examParticipation.exam.languageInspection.finishedAt
                : r.examParticipation.exam.gradedTime;
        });

        ids.forEach((id) => this.manuallyMovedIds.add(id));
        this.gradedReviews.update((current) => current.filter((gr) => !ids.includes(gr.examParticipation.id)));
        this.gradedLoggedReviews.update((current) => [...current, ...reviews]);
    }

    openAborted() {
        const modalRef = this.modal.openRef(AbortedExamsComponent, { size: 'xl' });
        const currentExam = this.exam();
        if (currentExam) {
            modalRef.componentInstance.exam.set(currentExam);
            modalRef.componentInstance.abortedExams.set(this.abortedExams());
        }
    }

    openNoShows() {
        const modalRef = this.modal.openRef(NoShowsComponent, { size: 'xl' });
        modalRef.componentInstance.noShows.set(this.noShows());
    }

    abortedExamsToBeFreed(): number {
        return this.abortedExams().filter(
            (ae) =>
                ae.examParticipation.exam.trialCount &&
                ae.examParticipation.exam.examEnrolments.length > 0 &&
                ae.examParticipation.exam.examEnrolments[0].retrialPermitted === false,
        ).length;
    }

    // Helper to get review ID (handles both regular and collaborative exams)
    private getReviewId = (r: Review): number | string | undefined => r.examParticipation.id ?? r.examParticipation._id;

    // Helper to filter out manually moved reviews
    private filterOutManuallyMoved(reviews: Review[]): Review[] {
        return reviews.filter((r) => {
            const id = this.getReviewId(r);
            return id === undefined || !this.manuallyMovedIds.has(id);
        });
    }

    // Helper to merge auto-synced reviews with preserved manually moved reviews
    private mergeAutoAndPreserved(autoSynced: Review[], current: Review[]): Review[] {
        const preserved = current.filter(
            (r) => this.getReviewId(r) !== undefined && this.manuallyMovedIds.has(this.getReviewId(r)!),
        );
        const autoSyncedIds = new Set(
            autoSynced.map(this.getReviewId).filter((id): id is number | string => id !== undefined),
        );
        return [
            ...autoSynced,
            ...preserved.filter((r) => {
                const id = this.getReviewId(r);
                return id !== undefined && !autoSyncedIds.has(id);
            }),
        ];
    }
}
