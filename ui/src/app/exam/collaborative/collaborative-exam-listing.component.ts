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
import type { OnInit } from '@angular/core';
import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, exhaustMap, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import type { User } from '../../session/session.service';
import { SessionService } from '../../session/session.service';
import type { CollaborativeExam } from '../exam.model';
import { CollaborativeExamState } from '../exam.model';
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
        this.examsPredicate = 'examActiveEndDate';
        this.reverse = true;
        this.loader = { loading: false };
        this.filterChanged
            .pipe(
                debounceTime(500),
                distinctUntilChanged(),
                switchMap((text) => this.CollaborativeExam.searchExams$(text)),
                tap(() => (this.loader.loading = true)),
                map((exams) => this.returnListedCollaborativeExams(exams)),
                tap((exams) => (this.exams = exams)),
                tap(() => (this.loader.loading = false)),
                takeUntil(this.ngUnsubscribe),
            )
            .subscribe();
        this.examCreated.pipe(exhaustMap(() => this.CollaborativeExam.createExam$())).subscribe({
            next: (exam: CollaborativeExam) => {
                toast.info(this.translate.instant('sitnet_exam_created'));
                this.router.navigate(['/staff/exams', exam.id, '1'], { queryParams: { collaborative: true } });
            },
            error: this.toast.error,
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

    returnListedCollaborativeExams(exams: CollaborativeExam[]): ListedCollaborativeExam[] {
        const listedExams: ListedCollaborativeExam[] = exams
            .map((e) => {
                const ownerAggregate = e.examOwners.map((o) => o.email).join();
                const stateTranslation = this.getStateTranslation(e);
                const listingView = this.determineListingView(e);

                return { ...e, ownerAggregate, stateTranslation, listingView };
            })
            .filter((e) => e.listingView !== ListingView.OTHER);

        return listedExams;
    }

    determineListingView(exam: CollaborativeExam) {
        if (
            (exam.state === CollaborativeExamState.PUBLISHED || exam.state === CollaborativeExamState.PRE_PUBLISHED) &&
            Date.now() > new Date(exam.examActiveEndDate).getTime()
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
        return exam.anonymous ? 'sitnet_anonymous_enabled' : 'sitnet_anonymous_disabled';
    }

    search = (event: KeyboardEvent) => {
        const e = event.target as HTMLInputElement;
        return this.filterChanged.next(e.value);
    };
}
