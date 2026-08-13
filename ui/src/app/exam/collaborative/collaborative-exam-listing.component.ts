// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { NgbNavModule, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, Subject } from 'rxjs';
import {
    catchError,
    debounceTime,
    distinctUntilChanged,
    exhaustMap,
    map,
    startWith,
    switchMap,
    tap,
} from 'rxjs/operators';
import type { CollaborativeExam, Exam } from 'src/app/exam/exam.model';
import { CollaborativeExamState } from 'src/app/exam/exam.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';
import { CollaborativeExamService } from './collaborative-exam.service';

enum ListingView {
    PUBLISHED = 'PUBLISHED',
    EXPIRED = 'EXPIRED',
    DRAFTS = 'DRAFTS',
    OTHER = 'OTHER',
}

interface ListedCollaborativeExam extends Exam {
    listingView: ListingView;
    ownerAggregate: string;
    stateTranslation: string;
}

@Component({
    selector: 'xm-collaborative-exam-listing',
    templateUrl: './collaborative-exam-listing.component.html',
    imports: [
        NgbNavModule,
        NgbPopover,
        TableSortComponent,
        RouterLink,
        UpperCasePipe,
        DatePipe,
        TranslateModule,
        OrderByPipe,
        PageHeaderComponent,
        PageContentComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollaborativeExamListingComponent {
    readonly view = signal<ListingView>(ListingView.PUBLISHED);
    readonly examsPredicate = signal('periodEnd');
    readonly reverse = signal(true);
    readonly user: User;

    // Reactive search with debouncing
    readonly exams = toSignal(
        toObservable(computed(() => this.filterText())).pipe(
            startWith(''),
            debounceTime(500),
            distinctUntilChanged(),
            tap(() => this.loading.set(true)),
            switchMap((text: string) => this.CollaborativeExam.searchExams$(text)),
            map((exams) => this.searchExams(exams || [])),
            tap(() => this.loading.set(false)),
            catchError((err) => {
                console.error('catchError:', err);
                this.toast.error(err);
                this.loading.set(false);
                return EMPTY;
            }),
        ),
        { initialValue: [] as ListedCollaborativeExam[] },
    );

    readonly loading = signal(false);

    readonly filteredExams = computed(() => {
        return this.exams().filter((e) => e.listingView === this.view());
    });

    readonly publishedCount = computed(
        () => this.exams().filter((e) => e.listingView === ListingView.PUBLISHED).length,
    );
    readonly expiredCount = computed(() => this.exams().filter((e) => e.listingView === ListingView.EXPIRED).length);
    readonly draftsCount = computed(() => this.exams().filter((e) => e.listingView === ListingView.DRAFTS).length);

    private readonly examCreated = new Subject<void>();
    private readonly filterText = signal('');

    private readonly destroyRef = inject(DestroyRef);
    private readonly router = inject(Router);
    private readonly translate = inject(TranslateService);
    private readonly toast = inject(ToastrService);
    private readonly Session = inject(SessionService);
    private readonly CollaborativeExam = inject(CollaborativeExamService);

    constructor() {
        const toast = this.toast;
        this.user = this.Session.getUser();
        this.examCreated
            .pipe(
                exhaustMap(() => this.CollaborativeExam.createExam$()),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (exam: CollaborativeExam) => {
                    toast.info(this.translate.instant('i18n_exam_added'));
                    this.router.navigate(['/staff/exams', exam.id, '1'], { queryParams: { collaborative: true } });
                },
                error: (err) => this.toast.error(err),
            });
        this.filterText.set('');
    }

    determineListingView(exam: Exam) {
        const state = exam.state as string;
        const periodEnd = exam.periodEnd;

        if (
            (state === 'PUBLISHED' ||
                state === 'PRE_PUBLISHED' ||
                state === CollaborativeExamState.PUBLISHED ||
                state === CollaborativeExamState.PRE_PUBLISHED) &&
            periodEnd &&
            Date.now() > new Date(periodEnd).getTime()
        ) {
            return ListingView.EXPIRED;
        }
        if (
            state === 'PUBLISHED' ||
            state === 'PRE_PUBLISHED' ||
            state === CollaborativeExamState.PUBLISHED ||
            state === CollaborativeExamState.PRE_PUBLISHED
        ) {
            return ListingView.PUBLISHED;
        }
        if (state === 'DRAFT' || state === CollaborativeExamState.DRAFT) {
            return ListingView.DRAFTS;
        }
        return ListingView.OTHER;
    }

    setView(view: ListingView | string) {
        this.view.set(view as ListingView);
    }

    setPredicate(predicate: string) {
        if (this.examsPredicate() === predicate) {
            this.reverse.update((v) => !v);
        }
        this.examsPredicate.set(predicate);
    }

    createExam() {
        this.examCreated.next();
    }

    getStateTranslation(exam: Exam): string {
        const translationStr = this.CollaborativeExam.getExamStateTranslation(exam);
        if (translationStr) {
            return this.translate.instant(translationStr);
        }
        return '';
    }

    getExamAnonymousStatus(exam: Exam) {
        return exam.anonymous ? 'i18n_anonymous_enabled' : 'i18n_anonymous_disabled';
    }

    search(event: KeyboardEvent) {
        const e = event.target as HTMLInputElement;
        this.filterText.set(e.value);
    }

    private searchExams(exams: Exam[]): ListedCollaborativeExam[] {
        return exams.map((e) => {
            const ownerAggregate = e.examOwners?.map((o) => o.email).join() || '';
            const stateTranslation = this.getStateTranslation(e);
            const listingView = this.determineListingView(e);

            return { ...e, ownerAggregate, stateTranslation, listingView };
        });
    }
}
