// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnInit } from '@angular/core';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil, tap } from 'rxjs/operators';
import type { CollaborativeExamInfo } from 'src/app/enrolment/enrolment.model';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import type { CollaborativeExam } from 'src/app/exam/exam.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { isObject } from 'src/app/shared/miscellaneous/helpers';
import { ExamSearchResultComponent } from './exam-search-result.component';

@Component({
    selector: 'xm-collaborative-exam-search',
    template: `
        <xm-page-header text="i18n_collaborative_exams" />
        <xm-page-content [content]="content" />
        <ng-template #content>
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
                            aria-label="exam-search"
                            [(ngModel)]="filter.text"
                            (ngModelChange)="search($event)"
                            type="text"
                            class="form-control"
                            placeholder="{{ 'i18n_search' | translate }}"
                        />
                        <div class="input-group-append bi-search search-append"></div>
                    </div>
                </div>
            </div>
            @if (searchDone) {
                <div class="row mt-2">
                    <div class="col-12" aria-live="polite">
                        {{ 'i18n_student_exam_search_result' | translate }} {{ exams.length }}
                        {{ 'i18n_student_exam_search_result_continues' | translate }}
                    </div>
                </div>
            }
            <div class="row mt-2">
                <div class="col" [hidden]="!loader.loading">
                    <button class="btn btn-success" type="button" disabled>
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        {{ 'i18n_searching' | translate }}...
                    </button>
                </div>
            </div>

            <div class="row mt-3">
                <div class="col-12">
                    @for (exam of exams; track exam) {
                        <div [hidden]="loader.loading">
                            <xm-exam-search-result [exam]="exam" [collaborative]="true"></xm-exam-search-result>
                        </div>
                    }
                </div>
            </div>
        </ng-template>
    `,
    standalone: true,
    imports: [FormsModule, ExamSearchResultComponent, TranslateModule, PageHeaderComponent, PageContentComponent],
})
export class CollaborativeExamSearchComponent implements OnInit, OnDestroy {
    exams: CollaborativeExamInfo[] = [];
    filter = { text: '' };
    loader = { loading: false };
    filterChanged: Subject<string> = new Subject<string>();
    ngUnsubscribe = new Subject();
    searchDone = false;

    constructor(private Enrolment: EnrolmentService) {
        this.filterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe(this._search);
    }

    ngOnInit() {
        this.filter = { text: '' };
        this.loader = { loading: false };
        this.search('');
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    search = (text: string) => this.filterChanged.next(text);

    updateExamList(exams: CollaborativeExam[]) {
        this.exams = exams.map((e) =>
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
        this.exams.forEach((e) => {
            this.Enrolment.getEnrolments(e.id, true).subscribe((enrolments) => {
                e.reservationMade = enrolments.some((e) => isObject(e.reservation));
                e.alreadyEnrolled = enrolments.length > 0;
            });
        });
    }

    private _search = (text: string) => {
        if (text.length > 2) {
            this.filter.text = text;
            this.loader = { loading: true };
            this.searchDone = true;
            this.Enrolment.searchExams$(text)
                .pipe(
                    tap((exams) => this.updateExamList(exams)),
                    finalize(() => (this.loader = { loading: false })),
                )
                .subscribe();
        }
    };
}
