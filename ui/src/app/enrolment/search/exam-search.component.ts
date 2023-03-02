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
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import type { EnrolmentInfo } from '../enrolment.model';
import { ExamSearchService } from './exam-search.service';

@Component({
    selector: 'xm-exam-search',
    template: `<div id="dashboard">
        <div class="top-row ms-2 me-2">
            <div class="col-md-12">
                <div class="student-title-wrap">
                    <h1 class="student-enroll-title">{{ 'sitnet_exams' | translate }}</h1>
                </div>
            </div>
        </div>
        <div class="detail-row ms-2 me-2 mt-3">
            <span class="col-md-12 mt-1 align-items-center">
                <img class="nopad" src="/assets/images/icon_info.png" class="pe-1" alt="info-icon" />
                &nbsp;
                <span *ngIf="permissionCheck.active === false">
                    {{ 'sitnet_exam_search_description' | translate }}
                </span>
                <span *ngIf="permissionCheck.active === true">{{ 'sitnet_search_restricted' | translate }}</span>
            </span>
        </div>
        <div class="detail-row ms-2 me-2 mt-2" *ngIf="permissionCheck.active === false">
            <div class="col-md-12">
                <div class="form-group input-group search">
                    <input
                        aria-label="exam-search"
                        (ngModelChange)="search($event)"
                        [(ngModel)]="filter.text"
                        type="text"
                        class="form-control search"
                        placeholder="{{ 'sitnet_search' | translate }}"
                    />
                    <div class="input-group-append search">
                        <img
                            class="nopad"
                            src="/assets/images/icon_search.png"
                            alt="search-icon"
                            width="49"
                            height="40"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div class="row mt-2 me-2 ms-2" *ngIf="exams.length > 0">
            <div class="col-md-12">
                {{ 'sitnet_student_exam_search_result' | translate }} {{ exams.length }}
                {{ 'sitnet_student_exam_search_result_continues' | translate }}
                <b>"{{ filter.text }}"</b>
            </div>
        </div>

        <div [@listAnimation]="exams.length" class="search-list-wrapper">
            <div class="" *ngFor="let exam of exams">
                <xm-exam-search-result [exam]="exam"></xm-exam-search-result>
            </div>
        </div>
    </div> `,
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
})
export class ExamSearchComponent implements OnInit, OnDestroy {
    exams: EnrolmentInfo[] = [];
    filterChanged: Subject<string> = new Subject<string>();
    ngUnsubscribe = new Subject();
    filter = { text: '' };
    permissionCheck = { active: false };

    constructor(private toast: ToastrService, private Search: ExamSearchService) {
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
