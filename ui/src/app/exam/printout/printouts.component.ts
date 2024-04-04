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
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { format, parseISO } from 'date-fns';
import { map } from 'rxjs/operators';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { CourseCodeComponent } from '../../shared/miscellaneous/course-code.component';
import { OrderByPipe } from '../../shared/sorting/order-by.pipe';
import { TableSortComponent } from '../../shared/sorting/table-sort.component';
import { TeacherListComponent } from '../../shared/user/teacher-list.component';
import type { Exam } from '../exam.model';

@Component({
    selector: 'xm-printout-listing',
    template: `
        <xm-page-header text="i18n_printout_exams" />
        <xm-page-content [content]="content" />
        <ng-template #content>
            <div class="row">
                <div class="col-md-12">
                    <table class="table table-striped table-sm xm-data-table">
                        <thead>
                            <tr>
                                <th>
                                    <xm-table-sort
                                        [reverse]="reverse"
                                        [predicate]="predicate"
                                        by="examinationDatesAggregate"
                                        text="i18n_examination_dates"
                                        (click)="setPredicate('examinationDatesAggregate')"
                                    ></xm-table-sort>
                                </th>
                                <th>
                                    <xm-table-sort
                                        [reverse]="reverse"
                                        [predicate]="predicate"
                                        by="course.code"
                                        text="i18n_examcode"
                                        (click)="setPredicate('course.code')"
                                    ></xm-table-sort>
                                </th>
                                <th>
                                    <xm-table-sort
                                        [reverse]="reverse"
                                        [predicate]="predicate"
                                        by="name"
                                        text="i18n_exam_name"
                                        (click)="setPredicate('name')"
                                    ></xm-table-sort>
                                </th>
                                <th>
                                    <xm-table-sort
                                        [reverse]="reverse"
                                        [predicate]="predicate"
                                        by="ownerAggregate"
                                        text="i18n_teachers"
                                        (click)="setPredicate('ownerAggregate')"
                                    ></xm-table-sort>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (exam of printouts | orderBy: predicate : reverse; track exam) {
                                <tr>
                                    <td>{{ exam.examinationDatesAggregate }}</td>
                                    <td>
                                        @if (exam.course) {
                                            <xm-course-code [course]="exam.course"></xm-course-code>
                                        }
                                    </td>
                                    <td>
                                        <a [routerLink]="['/staff/exams', exam.id, 'printout']"
                                            ><strong>{{ exam.name }}</strong></a
                                        >
                                    </td>
                                    <td>
                                        <xm-teacher-list [exam]="exam"></xm-teacher-list>
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </ng-template>
    `,
    standalone: true,
    imports: [
        TableSortComponent,
        CourseCodeComponent,
        RouterLink,
        TeacherListComponent,
        TranslateModule,
        OrderByPipe,
        PageHeaderComponent,
        PageContentComponent,
    ],
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
