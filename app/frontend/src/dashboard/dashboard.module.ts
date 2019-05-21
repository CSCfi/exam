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
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { OrderModule } from 'ngx-order-pipe';
import { UtilityModule } from '../utility/utility.module';
import { ExamListCategoryComponent } from './teacher/categories/examListCategory.component';
import { TeacherDashboardComponent } from './teacher/teacherDashboard.component';
import { TeacherDashboardService } from './teacher/teacherDashboard.service';
import { ReservationModule } from '../reservation/reservation.module';
import { ExamSearchPipe } from './examSearch.pipe';
import { StudentDashboardComponent } from './student/studentDashboard.component';
import { DashboardComponent } from './dashboard.component';
import { EnrolmentModule } from '../enrolment/enrolment.module';
import { StudentDashboardService } from './student/studentDashboard.service';

@NgModule({
    imports: [
        NgbModule,
        OrderModule,
        ReservationModule,
        UtilityModule,
        EnrolmentModule
    ],
    declarations: [
        ExamListCategoryComponent,
        TeacherDashboardComponent,
        StudentDashboardComponent,
        DashboardComponent,
        ExamSearchPipe
    ],
    entryComponents: [
        ExamListCategoryComponent,
        TeacherDashboardComponent,
        StudentDashboardComponent,
        DashboardComponent
    ],
    providers: [
        TeacherDashboardService,
        StudentDashboardService,
        ExamSearchPipe
    ]
})
export class DashboardModule { }
