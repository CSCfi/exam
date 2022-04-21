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
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { format, parseISO } from 'date-fns';
import { map } from 'rxjs/operators';
import type { Exam } from '../exam.model';

@Component({
    selector: 'xm-printout-listing',
    template: `<div id="sitnet-header" class="header">
            <div class="col-md-12 header-wrapper">
                <span class="header-text">{{ 'sitnet_printout_exams' | translate }}</span>
            </div>
        </div>
        <div id="dashboard">
            <div class="top-row">
                <div class="col-md-12">
                    <table class="table table-striped table-sm exams-table">
                        <thead>
                            <tr>
                                <th>
                                    <xm-table-sort
                                        [reverse]="reverse"
                                        [predicate]="predicate"
                                        by="examinationDatesAggregate"
                                        text="sitnet_examination_dates"
                                        (click)="setPredicate('examinationDatesAggregate')"
                                    ></xm-table-sort>
                                </th>
                                <th>
                                    <xm-table-sort
                                        [reverse]="reverse"
                                        [predicate]="predicate"
                                        by="course.code"
                                        text="sitnet_examcode"
                                        (click)="setPredicate('course.code')"
                                    ></xm-table-sort>
                                </th>
                                <th>
                                    <xm-table-sort
                                        [reverse]="reverse"
                                        [predicate]="predicate"
                                        by="name"
                                        text="sitnet_exam_name"
                                        (click)="setPredicate('name')"
                                    ></xm-table-sort>
                                </th>
                                <th>
                                    <xm-table-sort
                                        [reverse]="reverse"
                                        [predicate]="predicate"
                                        by="ownerAggregate"
                                        text="sitnet_teachers"
                                        (click)="setPredicate('ownerAggregate')"
                                    ></xm-table-sort>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let exam of printouts | orderBy: predicate:reverse">
                                <td>{{ exam.examinationDatesAggregate }}</td>
                                <td><xm-course-code *ngIf="exam.course" [course]="exam.course"></xm-course-code></td>
                                <td>
                                    <a
                                        class="exams-info-title bold-button"
                                        uiSref="staff.printoutListing"
                                        [uiParams]="{ id: exam.id }"
                                        >{{ exam.name }}</a
                                    >
                                </td>
                                <td>
                                    <xm-teacher-list [exam]="exam"></xm-teacher-list>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div> `,
})
export class PrintoutListingComponent implements OnInit {
    printouts: (Exam & { examinationDatesAggregate: string })[] = [];
    predicate = 'examinationDatesAggregate';
    reverse = true;

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.http
            .get<Exam[]>('/app/exam/printouts')
            .pipe(
                map((exams) => {
                    return exams.map((p) => {
                        const dates = p.examinationDates.map((ed) => ed.date).sort();
                        return {
                            ...p,
                            examinationDatesAggregate: dates.map((d) => format(parseISO(d), 'DD.MM.YYYY')).join(', '),
                        };
                    });
                }),
            )
            .subscribe((printouts) => (this.printouts = printouts));
    }

    setPredicate = (predicate: string) => {
        if (this.predicate === predicate) {
            this.reverse = !this.reverse;
        }
        this.predicate = predicate;
    };
}
