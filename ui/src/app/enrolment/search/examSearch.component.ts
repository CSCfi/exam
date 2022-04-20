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
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, OnDestroy } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import type { EnrolmentInfo, ExamEnrolment } from '../enrolment.model';

@Component({
    selector: 'exam-search',
    templateUrl: './examSearch.component.html',
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

    constructor(private http: HttpClient, private toast: ToastrService) {
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
        this.http.get<{ active: boolean }>('/app/settings/enrolmentPermissionCheck').subscribe((setting) => {
            this.permissionCheck = setting;
            if (setting.active === true) {
                this.doSearch();
            }
        });
    }

    search = (txt: string) => this.filterChanged.next(txt);

    private doSearch = () =>
        this.http.get<EnrolmentInfo[]>('/app/student/exams', { params: { filter: this.filter.text } }).subscribe(
            (exams) => {
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
            (err) => {
                this.toast.error(err);
            },
        );

    private checkEnrolment = () => {
        this.exams.forEach((exam) => {
            // TODO: optimize
            this.http.get<ExamEnrolment[]>(`/app/enrolments/exam/${exam.id}`).subscribe((enrolments) => {
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
