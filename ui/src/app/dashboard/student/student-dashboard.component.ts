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
