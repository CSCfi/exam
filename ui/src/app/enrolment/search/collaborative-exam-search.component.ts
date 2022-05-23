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
import { isObject } from 'lodash';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil, tap } from 'rxjs/operators';
import type { CollaborativeExam } from '../../exam/exam.model';
import type { CollaborativeExamInfo } from '../enrolment.model';
import { EnrolmentService } from '../enrolment.service';

@Component({
    selector: 'xm-collaborative-exam-search',
    template: `<div id="dashboard">
        <div class="student-details-title-wrap padtop padleft">
            <div class="student-exam-search-title">{{ 'sitnet_collaborative_exams' | translate }}</div>
        </div>
        <div class="student-details-title-wrap padleft">
            <span class="form-group">
                <img class="nopad" src="/assets/images/icon_info.png" alt="info-icon" /> &nbsp;
                <span>{{ 'sitnet_collaborative_exam_search_description' | translate }}</span>
            </span>
        </div>

        <div class="student-details-title-wrap padleft" style="width: 80%">
            <div class="form-group input-group search">
                <input
                    aria-label="exam-search"
                    [(ngModel)]="filter.text"
                    (ngModelChange)="search($event)"
                    type="text"
                    class="form-control search"
                    placeholder="{{ 'sitnet_search' | translate }}"
                />
                <div class="input-group-append search">
                    <img class="nopad" src="/assets/images/icon_search.png" alt="search-icon" width="49" height="40" />
                </div>
            </div>
        </div>

        <div *ngIf="exams.length > 0 && filter.text.length > 2" class="student-details-title-wrap padleft">
            {{ 'sitnet_student_exam_search_result' | translate }} {{ exams.length }}
            {{ 'sitnet_student_exam_search_result_continues' | translate }}
            <b>"{{ filter.text }}"</b>
        </div>
        <div class="student-details-title-wrap padleft">
            <button [hidden]="!loader.loading" class="btn btn-success">
                {{ 'sitnet_searching' | translate }}...
                <div class="spinner-border" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
            </button>
        </div>

        <div class="row">
            <div class="col-12 ms-4">
                <div class="exams-list list-item" [hidden]="loader.loading" *ngFor="let exam of exams">
                    <xm-exam-search-result [exam]="exam" [collaborative]="true"></xm-exam-search-result>
                </div>
            </div>
        </div>
    </div> `,
})
export class CollaborativeExamSearchComponent implements OnInit, OnDestroy {
    exams: CollaborativeExamInfo[] = [];
    filter = { text: '' };
    loader = { loading: false };
    filterChanged: Subject<string> = new Subject<string>();
    ngUnsubscribe = new Subject();

    constructor(private Enrolment: EnrolmentService) {
        this.filterChanged
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe(this._search);
    }

    ngOnInit() {
        this.filter = { text: '' };
        this.loader = { loading: false };
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
        if (text.length <= 2) {
            return;
        }
        this.filter.text = text;
        this.loader = { loading: true };

        this.Enrolment.searchExams$(text)
            .pipe(
                tap((exams) => this.updateExamList(exams)),
                finalize(() => (this.loader = { loading: false })),
            )
            .subscribe();
    };
}
