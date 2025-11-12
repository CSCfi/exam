// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { map } from 'rxjs/operators';
import type { Exam } from 'src/app/exam/exam.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';
import { TeacherListComponent } from 'src/app/shared/user/teacher-list.component';

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
                                        [reverse]="reverse()"
                                        [predicate]="predicate()"
                                        by="examinationDatesAggregate"
                                        text="i18n_examination_dates"
                                        (click)="setPredicate('examinationDatesAggregate')"
                                    ></xm-table-sort>
                                </th>
                                <th>
                                    <xm-table-sort
                                        [reverse]="reverse()"
                                        [predicate]="predicate()"
                                        by="course.code"
                                        text="i18n_examcode"
                                        (click)="setPredicate('course.code')"
                                    ></xm-table-sort>
                                </th>
                                <th>
                                    <xm-table-sort
                                        [reverse]="reverse()"
                                        [predicate]="predicate()"
                                        by="name"
                                        text="i18n_exam_name"
                                        (click)="setPredicate('name')"
                                    ></xm-table-sort>
                                </th>
                                <th>
                                    <xm-table-sort
                                        [reverse]="reverse()"
                                        [predicate]="predicate()"
                                        by="ownerAggregate"
                                        text="i18n_teachers"
                                        (click)="setPredicate('ownerAggregate')"
                                    ></xm-table-sort>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (exam of printouts() | orderBy: predicate() : reverse(); track exam) {
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintoutListingComponent {
    printouts = signal<(Exam & { examinationDatesAggregate: string })[]>([]);
    predicate = signal('examinationDatesAggregate');
    reverse = signal(true);

    private http = inject(HttpClient);

    constructor() {
        this.http
            .get<Exam[]>('/app/exam/printouts')
            .pipe(
                map((exams) => {
                    return exams.map((p) => {
                        const dates = p.examinationDates.map((ed) => ed.date).sort();
                        return {
                            ...p,
                            examinationDatesAggregate: dates
                                .map((d) => DateTime.fromISO(d).toFormat('dd.MM.yyyy'))
                                .join(', '),
                        };
                    });
                }),
            )
            .subscribe((printouts) => this.printouts.set(printouts));
    }

    setPredicate(predicate: string) {
        if (this.predicate() === predicate) {
            this.reverse.update((v) => !v);
        }
        this.predicate.set(predicate);
    }
}
