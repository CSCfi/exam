// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, map, switchMap, takeUntil } from 'rxjs/operators';
import type { CollaborativeExamInfo } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { CollaborativeExam } from 'src/app/exam/exam.model';
import { isObject } from 'src/app/shared/miscellaneous/helpers';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { ExamSearchResultComponent } from './exam-search-result.component';
import { ExamSearchService } from './exam-search.service';

interface LoadingState {
    loading: boolean;
}

@Component({
    selector: 'xm-collaborative-exam-search',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="row">
            <span class="col-12 align-items-center mt-3">
                <img src="/assets/images/icon_info.png" class="pe-1" alt="" />
                &nbsp;
                <span>{{ 'i18n_collaborative_exam_search_description' | translate }}</span>
            </span>
        </div>
        <div class="row mt-3">
            <div class="col-5">
                <div class="input-group">
                    <input
                        [(ngModel)]="filterText"
                        (ngModelChange)="search($event)"
                        type="text"
                        class="form-control"
                        [attr.aria-label]="'i18n_search' | translate"
                        placeholder="{{ 'i18n_search' | translate }}"
                        [disabled]="loader().loading"
                    />
                    <div class="input-group-append bi-search search-append"></div>
                </div>
            </div>
            <div class="col-7" ngbDropdown>
                <button class="btn btn-outline-secondary" type="button" ngbDropdownToggle aria-expanded="true">
                    {{ 'i18n_set_ordering' | translate }}:
                    @switch (filterOrdering()) {
                        @case ('name') {
                            {{
                                (filterReverse() ? 'i18n_exam_name_descending' : 'i18n_exam_name_ascending') | translate
                            }}
                        }
                        @case ('periodStart') {
                            {{ 'i18n_exam_period_start_ascending' | translate }}
                        }
                        @case ('periodEnd') {
                            {{ 'i18n_exam_period_end_ascending' | translate }}
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

        <!-- Loading State -->
        @if (loader().loading) {
            <div class="row mt-3">
                <div class="col-12">
                    <div class="d-flex align-items-center">
                        <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                        <span>{{ 'i18n_searching' | translate }}...</span>
                    </div>
                </div>
            </div>
        }

        @if (searchDone() && !loader().loading) {
            <div class="row mt-2">
                <div class="col-12" aria-live="polite">
                    {{ 'i18n_student_exam_search_result' | translate }}
                    {{ exams().length }}
                    {{ 'i18n_student_exam_search_result_continues' | translate }}
                </div>
            </div>
        }

        <div class="row mt-3">
            <div class="col-12">
                @for (exam of exams() | orderBy: filterOrdering() : filterReverse(); track exam.id) {
                    <div class="row mb-3">
                        <div class="col-12">
                            <xm-exam-search-result [exam]="exam" [collaborative]="true"></xm-exam-search-result>
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
export class CollaborativeExamSearchComponent implements OnDestroy {
    exams = signal<CollaborativeExamInfo[]>([]);
    filterOrdering = signal<'name' | 'periodStart' | 'periodEnd'>('name');
    filterReverse = signal(false);
    searchDone = signal(false);
    loader = signal<LoadingState>({ loading: false });
    filterChanged: Subject<string> = new Subject<string>();

    private _filterText = signal('');
    private readonly ngUnsubscribe = new Subject<void>();
    private toast = inject(ToastrService);
    private Search = inject(ExamSearchService);
    private Enrolment = inject(EnrolmentService);

    constructor() {
        this.setupSearchHandler();
        this.loadStoredFilters();
    }

    get filterText(): string {
        return this._filterText();
    }

    set filterText(value: string) {
        this._filterText.set(value);
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    search(text: string) {
        this._filterText.set(text);
        this.storeFilters();
        this.filterChanged.next(text);
    }

    updateSorting(ordering: string, reverse: boolean) {
        this.filterOrdering.set(ordering as 'name' | 'periodStart' | 'periodEnd');
        this.filterReverse.set(reverse);
        this.storeFilters();
    }

    private setupSearchHandler() {
        this.filterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe((text) => this.doSearch(text));
    }

    private loadStoredFilters() {
        const storedData = this.Search.loadFilters('collaborative');
        if (storedData.filters) {
            this._filterText.set(storedData.filters.text || '');
            this.filterOrdering.set((storedData.filters.ordering || 'name') as 'name' | 'periodStart' | 'periodEnd');
            this.filterReverse.set(storedData.filters.reverse || false);

            // If there are stored filters, trigger search
            if (this._filterText()) {
                this.filterChanged.next(this._filterText());
            }
        }
        this.loader.set({ loading: false });
    }

    private storeFilters() {
        this.Search.storeFilters(
            {
                text: this._filterText(),
                ordering: this.filterOrdering(),
                reverse: this.filterReverse(),
            },
            'collaborative',
        );
    }

    private doSearch(text: string) {
        this._filterText.set(text);

        if (text.length <= 2) {
            this.exams.set([]);
            this.searchDone.set(false);
            return;
        }

        this.loader.set({ loading: true });

        this.Enrolment.searchExams$(text)
            .pipe(
                switchMap((exams) => {
                    const transformedExams = this.processExams(exams);
                    return this.batchCheckEnrolmentStatus(transformedExams);
                }),
                finalize(() => this.loader.set({ loading: false })),
                takeUntil(this.ngUnsubscribe),
            )
            .subscribe({
                next: (checkedExams) => {
                    this.exams.set(checkedExams);
                    this.searchDone.set(true);
                },
                error: (err) => this.toast.error(err),
            });
    }

    private processExams(exams: CollaborativeExam[]): CollaborativeExamInfo[] {
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

    private batchCheckEnrolmentStatus(exams: CollaborativeExamInfo[]) {
        if (exams.length === 0) {
            return of(exams);
        }

        const enrolmentChecks = exams.map((exam) =>
            this.Enrolment.getEnrolments$(exam.id, true).pipe(
                map((enrolments) => {
                    exam.reservationMade = enrolments.some((e) => isObject(e.reservation));
                    exam.alreadyEnrolled = enrolments.length > 0;
                    return exam;
                }),
            ),
        );
        return forkJoin(enrolmentChecks);
    }
}
