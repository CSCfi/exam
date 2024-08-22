// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnInit } from '@angular/core';
import { Component, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardEnrolment } from 'src/app/dashboard/dashboard.model';
import { ActiveEnrolmentComponent } from 'src/app/enrolment/active/active-enrolment.component';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { StudentDashboardService } from './student-dashboard.service';

@Component({
    selector: 'xm-student-dashboard',
    standalone: true,
    imports: [ActiveEnrolmentComponent, TranslateModule, OrderByPipe, PageHeaderComponent, PageContentComponent],
    template: `<xm-page-header text="i18n_user_enrolled_exams_title" />
        <xm-page-content [content]="content"></xm-page-content>
        <ng-template #content>
            @for (enrolment of enrolments() | orderBy: 'startAtAggregate'; track enrolment) {
                <div class="row mb-2">
                    <div class="col-12">
                        <xm-active-enrolment
                            [enrolment]="enrolment"
                            (removed)="enrolmentRemoved($event)"
                        ></xm-active-enrolment>
                    </div>
                </div>
            } @empty {
                <div class="row">
                    <div class="col-12" role="note">
                        <img src="/assets/images/icon_info.png" alt="" />&nbsp;
                        {{ 'i18n_no_enrolments' | translate }}
                    </div>
                </div>
            }
        </ng-template>`,
})
export class StudentDashboardComponent implements OnInit {
    enrolments = signal<DashboardEnrolment[]>([]);

    constructor(private StudentDashboard: StudentDashboardService) {}

    ngOnInit() {
        this.StudentDashboard.listEnrolments$().subscribe((data) => this.enrolments.set(data));
    }

    enrolmentRemoved = (id: number) => {
        const index = this.enrolments()
            .map((e) => e.id)
            .indexOf(id);
        this.enrolments.update((es) => es.splice(index, 1));
    };
}
