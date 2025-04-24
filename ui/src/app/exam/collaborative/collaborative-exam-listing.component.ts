// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass, UpperCasePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, OnDestroy } from '@angular/core';
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
    standalone: true,
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
})
export class CollaborativeExamListingComponent implements OnInit, OnDestroy {
    exams: ListedCollaborativeExam[] = [];
    user: User;
    view: ListingView;
    examsPredicate: string;
    reverse: boolean;
    loader: { loading: boolean };
    filterChanged = new Subject<string>();
    examCreated = new Subject<void>();
    ngUnsubscribe = new Subject();

    constructor(
        private router: Router,
        private translate: TranslateService,
        private toast: ToastrService,
        private Session: SessionService,
        private CollaborativeExam: CollaborativeExamService,
    ) {
        this.view = ListingView.PUBLISHED;
        this.user = this.Session.getUser();
        this.examsPredicate = 'periodEnd';
        this.reverse = true;
        this.loader = { loading: false };
        this.filterChanged
            .pipe(
                debounceTime(500),
                distinctUntilChanged(),
                switchMap((text) => this.CollaborativeExam.searchExams$(text)),
                tap(() => (this.loader.loading = true)),
                map((exams) => this.searchExams(exams)),
                tap((exams) => (this.exams = exams)),
                tap(() => (this.loader.loading = false)),
                takeUntil(this.ngUnsubscribe),
            )
            .subscribe();
        this.examCreated.pipe(exhaustMap(() => this.CollaborativeExam.createExam$())).subscribe({
            next: (exam: CollaborativeExam) => {
                toast.info(this.translate.instant('i18n_exam_added'));
                this.router.navigate(['/staff/exams', exam.id, '1'], { queryParams: { collaborative: true } });
            },
            error: (err) => this.toast.error(err),
        });
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    ngOnInit() {
        this.listAllExams();
    }

    listAllExams = () => this.filterChanged.next('');

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

    filterByView = (view: string) => this.exams.filter((e) => this.determineListingView(e) === view);

    setView(view: ListingView) {
        this.view = view;
    }

    setPredicate = (predicate: string) => {
        if (this.examsPredicate === predicate) {
            this.reverse = !this.reverse;
        }
        this.examsPredicate = predicate;
    };

    createExam = () => this.examCreated.next();

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

    search = (event: KeyboardEvent) => {
        const e = event.target as HTMLInputElement;
        return this.filterChanged.next(e.value);
    };

    private searchExams = (exams: CollaborativeExam[]): ListedCollaborativeExam[] =>
        exams
            .map((e) => {
                const ownerAggregate = e.examOwners.map((o) => o.email).join();
                const stateTranslation = this.getStateTranslation(e);
                const listingView = this.determineListingView(e);

                return { ...e, ownerAggregate, stateTranslation, listingView };
            })
            .filter((e) => e.listingView !== ListingView.OTHER);
}
