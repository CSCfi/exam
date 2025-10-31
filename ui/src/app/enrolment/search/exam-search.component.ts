// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
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
import type { EnrolmentInfo } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { ExamSearchResultComponent } from './exam-search-result.component';
import { ExamSearchService } from './exam-search.service';

interface LoadingState {
    loading: boolean;
    error?: string;
}

@Component({
    selector: 'xm-exam-search',
    template: `
        <div class="row">
            <span class="col-12 align-items-center mt-3">
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
                            (ngModelChange)="search($event)"
                            [(ngModel)]="filter.text"
                            type="text"
                            class="form-control"
                            [attr.aria-label]="'i18n_search' | translate"
                            placeholder="{{ 'i18n_search' | translate }}"
                            [disabled]="loader.loading"
                        />
                        <div class="input-group-append bi-search search-append"></div>
                    </div>
                </div>
                <div class="col-7" ngbDropdown>
                    <button class="btn btn-outline-secondary" type="button" ngbDropdownToggle aria-expanded="true">
                        {{ 'i18n_set_ordering' | translate }}:
                        @switch (filter.ordering) {
                            @case ('name') {
                                {{
                                    (filter.reverse ? 'i18n_exam_name_descending' : 'i18n_exam_name_ascending')
                                        | translate
                                }}
                            }
                            @case ('periodStart') {
                                {{ 'i18n_exam_period_start_ascending' | translate }}
                            }
                            @case ('periodEnd') {
                                {{ 'i18n_exam_period_end_ascending' | translate }}
                            }
                            @default {
                                <!-- empty -->
                            }
                        }
                    </button>
                    <div ngbDropdownMenu role="menu">
                        <button ngbDropdownItem role="presentation" (click)="updateSorting('name', false)">
                            {{ 'i18n_exam_name_ascending' | translate }}
                        </button>
                        <button ngbDropdownItem role="presentation" (click)="updateSorting('name', true)">
                            {{ 'i18n_exam_name_descending' | translate }}
                        </button>
                        <button ngbDropdownItem role="presentation" (click)="updateSorting('periodStart', false)">
                            {{ 'i18n_exam_period_start_ascending' | translate }}
                        </button>
                        <button ngbDropdownItem role="presentation" (click)="updateSorting('periodEnd', false)">
                            {{ 'i18n_exam_period_end_ascending' | translate }}
                        </button>
                    </div>
                </div>
            </div>
        }

        <!-- Loading State -->
        @if (loader.loading) {
            <div class="row mt-3">
                <div class="col-12">
                    <div class="d-flex align-items-center">
                        <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                        <span>{{ 'i18n_searching' | translate }}...</span>
                    </div>
                </div>
            </div>
        }

        <!-- Error State -->
        @if (loader.error) {
            <div class="row mt-3">
                <div class="col-12">
                    <div class="alert alert-danger" role="alert">
                        {{ loader.error }}
                    </div>
                </div>
            </div>
        }

        @if (searchDone && !loader.loading) {
            <div class="row my-2">
                <div class="col-12" aria-live="polite">
                    {{ 'i18n_student_exam_search_result' | translate }} {{ exams.length }}
                    {{ 'i18n_student_exam_search_result_continues' | translate }}
                </div>
            </div>
        }

        <div class="row mt-3">
            <div class="col-12">
                @for (exam of exams | orderBy: filter.ordering : filter.reverse; track exam.id) {
                    <div class="row mb-3">
                        <div class="col-12">
                            <xm-exam-search-result [exam]="exam" />
                        </div>
                    </div>
                }
            </div>
        </div>
    `,
    imports: [
        FormsModule,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        ExamSearchResultComponent,
        TranslateModule,
        OrderByPipe,
    ],
})
export class ExamSearchComponent implements OnInit, OnDestroy {
    exams: EnrolmentInfo[] = [];
    filterChanged = new Subject<string>();
    filter = { text: '', ordering: 'name', reverse: false };
    searchDone = false;
    loader: LoadingState = { loading: false };
    permissionCheck = { active: false };

    private readonly ngUnsubscribe = new Subject<void>();
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private toast = inject(ToastrService);
    private http = inject(HttpClient);
    private Search = inject(ExamSearchService);
    private Enrolment = inject(EnrolmentService);

    constructor() {
        this.setupSearchHandler();
    }

    ngOnInit() {
        this.loadStoredFilters();
        this.loadPermissionCheck();
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    search = (text: string) => {
        this.filter.text = text;
        this.storeFilters();
        this.filterChanged.next(text);
    };

    updateSorting = (ordering: string, reverse: boolean) => {
        this.filter.ordering = ordering;
        this.filter.reverse = reverse;
        this.storeFilters();
    };

    private setupSearchHandler() {
        this.filterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe((text) => {
                if (this.permissionCheck.active === false) {
                    this.exams = [];
                    if (text) {
                        this.doSearch();
                    } else {
                        this.resetSearch();
                    }
                }
            });
    }

    private loadStoredFilters() {
        const storedData = this.Search.loadFilters('regular');
        if (storedData.filters) {
            this.filter = {
                text: storedData.filters.text || '',
                ordering: storedData.filters.ordering || 'name',
                reverse: storedData.filters.reverse || false,
            };

            // If there are stored filters, trigger search
            if (this.filter.text) {
                this.filterChanged.next(this.filter.text);
            }
        }
        this.loader = { loading: false };
        this.permissionCheck = { active: false };
    }

    private storeFilters() {
        this.Search.storeFilters(this.filter, 'regular');
    }

    private loadPermissionCheck() {
        this.Search.getEnrolmentPermissionCheckStatus$().subscribe({
            next: (setting) => {
                this.permissionCheck = setting;
                if (setting.active === true) {
                    this.doSearch();
                }
            },
            error: (err) => this.handleError(err),
        });
    }

    private resetSearch() {
        this.searchDone = false;
        this.loader = { loading: false };
    }

    private doSearch = () => {
        this.loader = { loading: true };
        this.searchDone = false;

        this.Search.listExams$(this.filter.text)
            .pipe(
                tap((exams) => this.processExams(exams)),
                switchMap((exams) => this.batchCheckEnrolmentStatus(exams)),
                finalize(() => (this.loader = { loading: false })),
                takeUntil(this.ngUnsubscribe),
            )
            .subscribe({
                next: (exams) => {
                    this.exams = exams;
                    this.searchDone = true;
                },
                error: (err) => this.handleError(err),
            });
    };

    private processExams(exams: EnrolmentInfo[]) {
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

    private handleError(error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : typeof error === 'string' ? error : 'An error occurred';

        this.loader = { loading: false, error: errorMessage };
        this.toast.error(errorMessage);
    }
}
