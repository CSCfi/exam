// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ActiveEnrolmentComponent } from 'src/app/enrolment/active/active-enrolment.component';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import type { DashboardEnrolment } from './student-dashboard.service';
import { StudentDashboardService } from './student-dashboard.service';

@Component({
    selector: 'xm-student-dashboard',
    templateUrl: './student-dashboard.component.html',
    standalone: true,
    imports: [ActiveEnrolmentComponent, TranslateModule, OrderByPipe, PageHeaderComponent, PageContentComponent],
})
export class StudentDashboardComponent implements OnInit {
    userEnrolments: DashboardEnrolment[] = [];

    constructor(private StudentDashboard: StudentDashboardService) {}

    ngOnInit() {
        this.StudentDashboard.listEnrolments().subscribe((data) => (this.userEnrolments = data));
    }

    enrolmentRemoved = (id: number) => {
        const index = this.userEnrolments.map((e) => e.id).indexOf(id);
        this.userEnrolments.splice(index, 1);
    };
}
