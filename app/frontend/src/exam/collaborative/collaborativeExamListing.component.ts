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
import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { SessionService, User } from '../../session/session.service';
import { CollaborativeExam, CollaborativeExamState } from '../exam.model';
import { CollaborativeExamService } from './collaborativeExam.service';

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
    selector: 'collaborative-exam-listing',
    template: require('./collaborativeExamListing.component.html'),
})
export class CollaborativeExamListingComponent implements OnInit {
    exams: ListedCollaborativeExam[];
    user: User;
    view: ListingView;
    examsPredicate: string;
    reverse: boolean;
    filter: { text: string };
    loader: { loading: boolean };
    filterChanged: Subject<string> = new Subject<string>();

    constructor(
        private state: StateService,
        private translate: TranslateService,
        private Session: SessionService,
        private CollaborativeExam: CollaborativeExamService,
    ) {
        this.filterChanged.pipe(debounceTime(500), distinctUntilChanged()).subscribe(this.doSearch);
    }

    ngOnInit() {
        this.view = ListingView.PUBLISHED;
        this.user = this.Session.getUser();
        this.examsPredicate = 'examActiveEndDate';
        this.reverse = true;
        this.filter = { text: '' };
        this.loader = { loading: false };
        this.listAllExams();
    }

    listAllExams = () =>
        this.CollaborativeExam.listExams()
            .pipe(
                tap(exams => (this.exams = this.returnListedCollaborativeExams(exams))),
                finalize(() => (this.loader = { loading: false })),
            )
            .subscribe();

    returnListedCollaborativeExams(exams: CollaborativeExam[]): ListedCollaborativeExam[] {
        const listedExams: ListedCollaborativeExam[] = exams
            .map(e => {
                const ownerAggregate = e.examOwners.map(o => o.email).join();
                const stateTranslation = this.getStateTranslation(e);
                const listingView = this.determineListingView(e);

                return { ...e, ownerAggregate, stateTranslation, listingView };
            })
            .filter(e => e.listingView !== ListingView.OTHER);

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

    setView(view: ListingView) {
        this.view = view;
    }

    createExam() {
        this.CollaborativeExam.createExam().subscribe(
            (exam: CollaborativeExam) => {
                toast.info(this.translate.instant('sitnet_exam_created'));
                this.state.go('collaborativeExamEditor', { id: exam.id, tab: 1 });
            },
            err => toast.error(err.data),
        );
    }

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

    search = (text: string) => this.filterChanged.next(text);

    private doSearch = (text: string) => {
        this.filter.text = text;
        this.loader = { loading: true };

        if (text.length === 0) {
            this.listAllExams();
            return;
        }

        this.CollaborativeExam.searchExams(text)
            .pipe(
                tap(
                    exams => (this.exams = this.returnListedCollaborativeExams(exams)),
                    finalize(() => (this.loader = { loading: false })),
                ),
            )
            .subscribe();
    };
}
