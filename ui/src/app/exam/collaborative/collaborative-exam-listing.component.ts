// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import type { CollaborativeExam } from 'src/app/exam/exam.model';
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

interface ListedCollaborativeExam extends CollaborativeExam {
    listingView: ListingView;
    ownerAggregate: string;
    stateTranslation: string;
}

@Component({
    selector: 'xm-collaborative-exam-listing',
    templateUrl: './collaborative-exam-listing.component.html',
    imports: [
        NgbNav,
        NgbNavItem,
        NgbNavItemRole,
        NgbNavLink,
        NgbPopover,
        TableSortComponent,
        RouterLink,
        NgClass,
        UpperCasePipe,
        DatePipe,
        TranslateModule,
        OrderByPipe,
        PageHeaderComponent,
        PageContentComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollaborativeExamListingComponent implements OnDestroy {
    exams = signal<ListedCollaborativeExam[]>([]);
    user: User;
    view = signal<ListingView>(ListingView.PUBLISHED);
    examsPredicate = signal('periodEnd');
    reverse = signal(true);
    loading = signal(false);
    filterChanged = new Subject<string>();
    examCreated = new Subject<void>();
    ngUnsubscribe = new Subject<void>();

    private router = inject(Router);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Session = inject(SessionService);
    private CollaborativeExam = inject(CollaborativeExamService);

    constructor() {
        const toast = this.toast;
        this.user = this.Session.getUser();
        this.filterChanged
            .pipe(
                debounceTime(500),
                distinctUntilChanged(),
                switchMap((text) => this.CollaborativeExam.searchExams$(text)),
                tap(() => this.loading.set(true)),
                map((exams) => this.searchExams(exams)),
                tap((exams) => this.exams.set(exams)),
                tap(() => this.loading.set(false)),
                takeUntil(this.ngUnsubscribe),
            )
            .subscribe();
        this.examCreated
            .pipe(
                exhaustMap(() => this.CollaborativeExam.createExam$()),
                takeUntil(this.ngUnsubscribe),
            )
            .subscribe({
                next: (exam: CollaborativeExam) => {
                    toast.info(this.translate.instant('i18n_exam_added'));
                    this.router.navigate(['/staff/exams', exam.id, '1'], { queryParams: { collaborative: true } });
                },
                error: (err) => this.toast.error(err),
            });
        this.listAllExams();
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    listAllExams() {
        this.filterChanged.next('');
    }

    determineListingView(exam: CollaborativeExam) {
        if (
            (exam.state === CollaborativeExamState.PUBLISHED || exam.state === CollaborativeExamState.PRE_PUBLISHED) &&
            Date.now() > new Date(exam.periodEnd).getTime()
        ) {
            return ListingView.EXPIRED;
        }
        if (exam.state === CollaborativeExamState.PUBLISHED || exam.state === CollaborativeExamState.PRE_PUBLISHED) {
            return ListingView.PUBLISHED;
        }
        if (exam.state === CollaborativeExamState.DRAFT) {
            return ListingView.DRAFTS;
        }
        return ListingView.OTHER;
    }

    filterByView(view: string) {
        return this.exams().filter((e) => this.determineListingView(e) === view);
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

    getStateTranslation(exam: CollaborativeExam): string {
        const translationStr = this.CollaborativeExam.getExamStateTranslation(exam);
        if (translationStr) {
            return this.translate.instant(translationStr);
        }
        return '';
    }

    getExamAnonymousStatus(exam: CollaborativeExam) {
        return exam.anonymous ? 'i18n_anonymous_enabled' : 'i18n_anonymous_disabled';
    }

    search(event: KeyboardEvent) {
        const e = event.target as HTMLInputElement;
        this.filterChanged.next(e.value);
    }

    private searchExams(exams: CollaborativeExam[]): ListedCollaborativeExam[] {
        return exams
            .map((e) => {
                const ownerAggregate = e.examOwners.map((o) => o.email).join();
                const stateTranslation = this.getStateTranslation(e);
                const listingView = this.determineListingView(e);

                return { ...e, ownerAggregate, stateTranslation, listingView };
            })
            .filter((e) => e.listingView !== ListingView.OTHER);
    }
}
