/*
 * Copyright (c) 2017 Exam Consortium
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
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';

import type { OnInit } from '@angular/core';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import type { EnrolmentInfo } from 'src/app/enrolment/enrolment.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { AutoFocusDirective } from 'src/app/shared/select/auto-focus.directive';
import { ExamSearchResultComponent } from './exam-search-result.component';
import { ExamSearchService } from './exam-search.service';

@Component({
    selector: 'xm-exam-search',
    template: `
        <xm-page-header text="i18n_exams" />
        <xm-page-content [content]="content" />
        <ng-template #content>
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
                                (ngModelChange)="search($event)"
                                [(ngModel)]="filter.text"
                                type="text"
                                class="form-control"
                                [attr.aria-label]="'i18n_search' | translate"
                                placeholder="{{ 'i18n_search' | translate }}"
                            />
                            <div class="input-group-append search" aria-hidden="true">
                                <img src="/assets/images/icon_search.png" alt="search-icon" width="49" height="40" />
                            </div>
                        </div>
                    </div>
                </div>
            }

            <div class="row my-2">
                <div class="col-md-12" aria-live="polite">
                    {{ 'i18n_student_exam_search_result' | translate }} {{ exams.length }}
                    {{ 'i18n_student_exam_search_result_continues' | translate }}
                </div>
            </div>

            <div [@listAnimation]="exams.length">
                @for (exam of exams; track exam.id) {
                    <div class="row mb-3">
                        <div class="col-12">
                            <xm-exam-search-result [exam]="exam" />
                        </div>
                    </div>
                }
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
    standalone: true,
    imports: [
        FormsModule,
        AutoFocusDirective,
        ExamSearchResultComponent,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class ExamSearchComponent implements OnInit, OnDestroy {
    exams: EnrolmentInfo[] = [];
    filterChanged = new Subject<string>();
    ngUnsubscribe = new Subject();
    filter = { text: '' };
    permissionCheck = { active: false };

    constructor(
        private toast: ToastrService,
        private Search: ExamSearchService,
    ) {
        this.filterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe((txt) => {
                if (this.permissionCheck.active === false) {
                    this.exams = [];
                    if (txt) {
                        this.doSearch();
                    }
                }
            });
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    ngOnInit() {
        this.filter = { text: '' };
        this.permissionCheck = { active: false };
        this.Search.getEnrolmentPermissionCheckStatus$().subscribe((setting) => {
            this.permissionCheck = setting;
            if (setting.active === true) {
                this.doSearch();
            }
        });
    }

    search = (txt: string) => this.filterChanged.next(txt);

    private doSearch = () =>
        this.Search.listExams$(this.filter.text).subscribe({
            next: (exams) => {
                exams.forEach((exam) => {
                    if (!exam.examLanguages) {
                        console.warn('No languages for exam #' + exam.id);
                        exam.examLanguages = [];
                    }
                    exam.languages = exam.examLanguages.map((lang) => lang.name);
                });
                this.exams = exams;
                this.checkEnrolment();
            },
            error: (err) => this.toast.error(err),
        });

    private checkEnrolment = () => {
        this.exams.forEach((exam) => {
            // TODO: optimize
            this.Search.checkEnrolmentStatus$(exam.id).subscribe((enrolments) => {
                if (enrolments.length === 0) {
                    exam.alreadyEnrolled = false;
                    exam.reservationMade = false;
                } else {
                    exam.alreadyEnrolled = true;
                    exam.reservationMade = enrolments.some((e) => e.reservation || e.examinationEventConfiguration);
                }
            });
        });
    };
}
