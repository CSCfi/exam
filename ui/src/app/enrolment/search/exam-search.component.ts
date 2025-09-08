// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { animate, query, stagger, style, transition, trigger } from '@angular/animations';

import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbNav, NgbNavChangeEvent, NgbNavItem, NgbNavLink } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject, forkJoin, of } from 'rxjs';
import {
    catchError,
    debounceTime,
    distinctUntilChanged,
    finalize,
    map,
    switchMap,
    takeUntil,
    tap,
} from 'rxjs/operators';
import type { CollaborativeExamInfo, EnrolmentInfo } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { CollaborativeExam } from 'src/app/exam/exam.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { isObject } from 'src/app/shared/miscellaneous/helpers';
import { ExamSearchResultComponent } from './exam-search-result.component';
import { ExamSearchService } from './exam-search.service';

interface LoadingState {
    loading: boolean;
    error?: string;
}

interface ExamTab {
    id: number;
    key: string;
    labelKey: string;
}

const EXAM_TABS: ExamTab[] = [
    { id: 1, key: 'regular', labelKey: 'i18n_exams' },
    { id: 2, key: 'collaborative', labelKey: 'i18n_collaborative_exams' },
];

@Component({
    selector: 'xm-exam-search',
    template: `
        <xm-page-header text="i18n_exams" />
        <xm-page-content [content]="content" />
        <ng-template #content>
            <!-- Tab Navigation -->
            <div class="row">
                <div class="col-12">
                    <ul
                        ngbNav
                        #nav="ngbNav"
                        [(activeId)]="activeTab"
                        class="nav-tabs"
                        [keyboard]="false"
                        [destroyOnHide]="false"
                        (navChange)="onTabChange($event)"
                        role="tablist"
                    >
                        @for (tab of availableTabs; track tab.id) {
                            <li [ngbNavItem]="tab.id">
                                <a ngbNavLink [attr.aria-selected]="activeTab === tab.id" role="tab">
                                    {{ tab.labelKey | translate }}
                                </a>
                            </li>
                        }
                    </ul>
                </div>
            </div>

            <!-- Tab Content -->
            <div class="row mt-3">
                <div class="col-12">
                    <!-- Regular Exams Tab -->
                    @if (activeTab === 1) {
                        <div role="tabpanel" [attr.aria-labelledby]="'tab-regular'" [attr.id]="'tab-content-regular'">
                            <div class="row">
                                <span class="col-12 align-items-center">
                                    <img src="/assets/images/icon_info.png" class="pe-1" alt="" />
                                    &nbsp;
                                    @if (permissionCheck.active === false) {
                                        {{ 'i18n_exam_search_description' | translate }}
                                    }
                                    @if (permissionCheck.active === true) {
                                        {{ 'i18n_search_restricted' | translate }}
                                    }
                                </span>
                            </div>
                            @if (permissionCheck.active === false) {
                                <div class="row mt-3">
                                    <div class="col-5">
                                        <div class="input-group">
                                            <input
                                                (ngModelChange)="searchRegular($event)"
                                                [(ngModel)]="regularFilter.text"
                                                type="text"
                                                class="form-control"
                                                [attr.aria-label]="'i18n_search' | translate"
                                                placeholder="{{ 'i18n_search' | translate }}"
                                                [disabled]="regularLoader.loading"
                                            />
                                            <div class="input-group-append bi-search search-append"></div>
                                        </div>
                                    </div>
                                </div>
                            }

                            <!-- Loading State -->
                            @if (regularLoader.loading) {
                                <div class="row mt-3">
                                    <div class="col-12">
                                        <div class="d-flex align-items-center">
                                            <div
                                                class="spinner-border spinner-border-sm me-2"
                                                role="status"
                                                aria-hidden="true"
                                            ></div>
                                            <span>{{ 'i18n_searching' | translate }}...</span>
                                        </div>
                                    </div>
                                </div>
                            }

                            <!-- Error State -->
                            @if (regularLoader.error) {
                                <div class="row mt-3">
                                    <div class="col-12">
                                        <div class="alert alert-danger" role="alert">
                                            {{ regularLoader.error }}
                                        </div>
                                    </div>
                                </div>
                            }

                            @if (regularSearchDone && !regularLoader.loading) {
                                <div class="row my-2">
                                    <div class="col-12" aria-live="polite">
                                        {{ 'i18n_student_exam_search_result' | translate }} {{ regularExams.length }}
                                        {{ 'i18n_student_exam_search_result_continues' | translate }}
                                    </div>
                                </div>
                            }

                            <div [@listAnimation]="regularExams.length">
                                @for (exam of regularExams; track exam.id) {
                                    <div class="row mb-3">
                                        <div class="col-12">
                                            <xm-exam-search-result [exam]="exam" />
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    }

                    <!-- Collaborative Exams Tab -->
                    @if (activeTab === 2) {
                        <div
                            role="tabpanel"
                            [attr.aria-labelledby]="'tab-collaborative'"
                            [attr.id]="'tab-content-collaborative'"
                        >
                            <div class="row">
                                <div class="col-12">
                                    <img src="/assets/images/icon_info.png" alt="" /> &nbsp;
                                    <span>{{ 'i18n_collaborative_exam_search_description' | translate }}</span>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-4">
                                    <div class="input-group">
                                        <input
                                            [(ngModel)]="collaborativeFilter.text"
                                            (ngModelChange)="searchCollaborative($event)"
                                            type="text"
                                            class="form-control"
                                            [attr.aria-label]="'i18n_search' | translate"
                                            placeholder="{{ 'i18n_search' | translate }}"
                                            [disabled]="collaborativeLoader.loading"
                                        />
                                        <div class="input-group-append bi-search search-append"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Loading State -->
                            @if (collaborativeLoader.loading) {
                                <div class="row mt-3">
                                    <div class="col-12">
                                        <div class="d-flex align-items-center">
                                            <div
                                                class="spinner-border spinner-border-sm me-2"
                                                role="status"
                                                aria-hidden="true"
                                            ></div>
                                            <span>{{ 'i18n_searching' | translate }}...</span>
                                        </div>
                                    </div>
                                </div>
                            }

                            <!-- Error State -->
                            @if (collaborativeLoader.error) {
                                <div class="row mt-3">
                                    <div class="col-12">
                                        <div class="alert alert-danger" role="alert">
                                            {{ collaborativeLoader.error }}
                                        </div>
                                    </div>
                                </div>
                            }

                            @if (collaborativeSearchDone && !collaborativeLoader.loading) {
                                <div class="row mt-2">
                                    <div class="col-12" aria-live="polite">
                                        {{ 'i18n_student_exam_search_result' | translate }}
                                        {{ collaborativeExams.length }}
                                        {{ 'i18n_student_exam_search_result_continues' | translate }}
                                    </div>
                                </div>
                            }

                            <div class="row mt-3">
                                <div class="col-12">
                                    @for (exam of collaborativeExams; track exam.id) {
                                        <div class="row mb-3">
                                            <div class="col-12">
                                                <xm-exam-search-result
                                                    [exam]="exam"
                                                    [collaborative]="true"
                                                ></xm-exam-search-result>
                                            </div>
                                        </div>
                                    }
                                </div>
                            </div>
                        </div>
                    }
                </div>
            </div>
        </ng-template>
    `,
    animations: [
        trigger('listAnimation', [
            transition('* <=> *', [
                query(
                    ':enter',
                    [style({ opacity: 0 }), stagger('60ms', animate('600ms ease-out', style({ opacity: 1 })))],
                    { optional: true },
                ),
                query(':leave', animate('100ms', style({ opacity: 0 })), { optional: true }),
            ]),
        ]),
    ],
    styleUrls: ['./exam-search.component.scss'],
    imports: [
        FormsModule,
        NgbNav,
        NgbNavItem,
        NgbNavLink,
        ExamSearchResultComponent,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class ExamSearchComponent implements OnInit, OnDestroy {
    // Configuration and tabs
    availableTabs: ExamTab[] = EXAM_TABS;

    // Regular exams
    regularExams: EnrolmentInfo[] = [];
    regularFilterChanged = new Subject<string>();
    regularFilter = { text: '' };
    regularSearchDone = false;
    regularLoader: LoadingState = { loading: false };

    // Collaborative exams
    collaborativeExams: CollaborativeExamInfo[] = [];
    collaborativeFilterChanged: Subject<string> = new Subject<string>();
    collaborativeFilter = { text: '' };
    collaborativeSearchDone = false;
    collaborativeLoader: LoadingState = { loading: false };

    // General
    permissionCheck = { active: false };
    activeTab = 1;

    // Private members
    private readonly ngUnsubscribe = new Subject<void>();
    private collaborationSupported = true; // Default to true to show tabs until loaded

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private toast = inject(ToastrService);
    private http = inject(HttpClient);
    private Search = inject(ExamSearchService);
    private Enrolment = inject(EnrolmentService);

    constructor() {
        this.setupSearchHandlers();
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    ngOnInit() {
        this.loadStoredFilters();
        this.loadCollaborationConfiguration();
    }

    searchRegular = (text: string) => {
        this.regularFilter.text = text;
        this.storeFilters();
        this.regularFilterChanged.next(text);
    };

    searchCollaborative = (text: string) => {
        this.collaborativeFilter.text = text;
        this.storeFilters();
        this.collaborativeFilterChanged.next(text);
    };

    onTabChange = (event: NgbNavChangeEvent) => {
        let tabKey = '';
        if (event.nextId === 2) {
            tabKey = 'collaborative';
        }
        const queryParams = tabKey ? { tab: tabKey } : {};
        this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
    };

    private setupSearchHandlers() {
        // Regular exams search
        this.regularFilterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe((text) => {
                if (this.permissionCheck.active === false) {
                    this.regularExams = [];
                    if (text) {
                        this.doRegularSearch();
                    } else {
                        this.resetRegularSearch();
                    }
                }
            });

        // Collaborative exams search
        this.collaborativeFilterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe(this.doCollaborativeSearch);
    }

    private loadStoredFilters() {
        const storedData = this.Search.loadFilters('search');
        if (storedData.filters) {
            this.regularFilter = { text: storedData.filters.regularText || '' };
            this.collaborativeFilter = { text: storedData.filters.collaborativeText || '' };

            // If there are stored filters, trigger search
            if (this.regularFilter.text) {
                this.regularFilterChanged.next(this.regularFilter.text);
            }
            if (this.collaborativeFilter.text) {
                this.collaborativeFilterChanged.next(this.collaborativeFilter.text);
            }
        } else {
            this.initializeFilters();
        }
        this.regularLoader = { loading: false };
        this.collaborativeLoader = { loading: false };
        this.permissionCheck = { active: false };
    }

    private initializeFilters() {
        this.regularFilter = { text: '' };
        this.collaborativeFilter = { text: '' };
    }

    private storeFilters() {
        const filters = {
            regularText: this.regularFilter.text,
            collaborativeText: this.collaborativeFilter.text,
        };
        this.Search.storeFilters(filters, 'search');
    }

    private setupTabFromUrl() {
        const tabParam = this.route.snapshot.queryParamMap.get('tab');

        if (tabParam === 'collaborative' && this.collaborationSupported) {
            this.activeTab = 2;
        } else {
            this.activeTab = 1;

            // If requested tab is not available, update URL to reflect actual tab
            if (tabParam === 'collaborative' && !this.collaborationSupported) {
                this.router.navigate([], { queryParams: {}, queryParamsHandling: 'merge' });
            }
        }
    }

    private loadPermissionCheck() {
        this.Search.getEnrolmentPermissionCheckStatus$().subscribe({
            next: (setting) => {
                this.permissionCheck = setting;
                if (setting.active === true) {
                    this.doRegularSearch();
                }
            },
            error: (err) => this.handleError('regular', err),
        });
    }

    private loadCollaborationConfiguration() {
        this.http
            .get<{ isExamCollaborationSupported: boolean }>('/app/settings/iop/examCollaboration')
            .subscribe((config) => {
                this.collaborationSupported = config.isExamCollaborationSupported;
                this.updateAvailableTabs();
                this.setupTabFromUrl();
                this.loadPermissionCheck();
            });
    }

    private updateAvailableTabs() {
        this.availableTabs = this.collaborationSupported ? EXAM_TABS : [EXAM_TABS[0]];
    }

    private resetRegularSearch() {
        this.regularSearchDone = false;
        this.regularLoader = { loading: false };
    }

    private doRegularSearch = () => {
        this.regularLoader = { loading: true };
        this.regularSearchDone = false;

        this.Search.listExams$(this.regularFilter.text)
            .pipe(
                tap((exams) => this.processRegularExams(exams)),
                switchMap((exams) => this.batchCheckEnrolmentStatus(exams)),
                finalize(() => (this.regularLoader = { loading: false })),
                takeUntil(this.ngUnsubscribe),
            )
            .subscribe({
                next: (exams) => {
                    this.regularExams = exams;
                    this.regularSearchDone = true;
                },
                error: (err) => this.handleError('regular', err),
            });
    };

    private processRegularExams(exams: EnrolmentInfo[]) {
        exams.forEach((exam) => {
            if (!exam.examLanguages) {
                console.warn('No languages for exam #' + exam.id);
                exam.examLanguages = [];
            }
            exam.languages = exam.examLanguages.map((lang) => lang.name);
        });
    }

    private batchCheckEnrolmentStatus(exams: EnrolmentInfo[]) {
        if (exams.length === 0) {
            return of(exams);
        }

        const enrolmentChecks = exams.map((exam) => this.checkEnrolmentStatus(exam));
        return forkJoin(enrolmentChecks);
    }

    private checkEnrolmentStatus(exam: EnrolmentInfo): Observable<EnrolmentInfo> {
        // TODO: optimize
        return this.Search.checkEnrolmentStatus$(exam.id).pipe(
            map((enrolments) => {
                if (enrolments.length > 0) {
                    exam.alreadyEnrolled = true;
                    exam.reservationMade = enrolments.some((e) => e.reservation || e.examinationEventConfiguration);
                } else {
                    exam.alreadyEnrolled = false;
                    exam.reservationMade = false;
                }
                return exam;
            }),
            catchError(() => {
                exam.alreadyEnrolled = false;
                exam.reservationMade = false;
                return of(exam);
            }),
        );
    }

    private doCollaborativeSearch = (text: string) => {
        this.collaborativeFilter.text = text;

        if (text.length <= 2) {
            this.collaborativeExams = [];
            this.collaborativeSearchDone = false;
            return;
        }

        this.collaborativeLoader = { loading: true };

        this.Enrolment.searchExams$(text)
            .pipe(
                switchMap((exams) => {
                    const transformedExams = this.processCollaborativeExams(exams);
                    return this.batchCheckCollaborativeEnrolmentStatus(transformedExams);
                }),
                finalize(() => (this.collaborativeLoader = { loading: false })),
                takeUntil(this.ngUnsubscribe),
            )
            .subscribe({
                next: (checkedExams) => {
                    this.collaborativeExams = checkedExams;
                    this.collaborativeSearchDone = true;
                },
                error: (err) => this.handleError('collaborative', err),
            });
    };

    private processCollaborativeExams(exams: CollaborativeExam[]): CollaborativeExamInfo[] {
        return exams.map((e) =>
            Object.assign(e, {
                reservationMade: false,
                alreadyEnrolled: false,
                noTrialsLeft: false,
                languages: e.examLanguages.map((l) => l.name),
                implementation: 'AQUARIUM',
                course: { name: '', code: '', id: 0, credits: 0 },
                examInspections: [],
                parent: null,
            }),
        );
    }

    private batchCheckCollaborativeEnrolmentStatus(exams: CollaborativeExamInfo[]) {
        if (exams.length === 0) {
            return of(exams);
        }

        const enrolmentChecks = exams.map((exam) =>
            this.Enrolment.getEnrolments(exam.id, true).pipe(
                map((enrolments) => {
                    exam.reservationMade = enrolments.some((e) => isObject(e.reservation));
                    exam.alreadyEnrolled = enrolments.length > 0;
                    return exam;
                }),
            ),
        );
        return forkJoin(enrolmentChecks);
    }

    private handleError(type: 'regular' | 'collaborative', error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';

        if (type === 'regular') {
            this.regularLoader = { loading: false, error: errorMessage };
        } else {
            this.collaborativeLoader = { loading: false, error: errorMessage };
        }

        this.toast.error(errorMessage);
    }
}
