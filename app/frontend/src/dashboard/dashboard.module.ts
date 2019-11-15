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

import { UtilityModule } from '../utility/utility.module';
import { AdminDashboardModule } from './admin/adminDashboard.module';
import { DashboardComponent } from './dashboard.component';
import { StudentDashboardModule } from './student/studentDashboard.module';
import { TeacherDashboardModule } from './teacher/teacherDashboard.module';

// TODO: Student & teacher dashboard + reservation modules should be lazy loaded to decrease bundle size
// We need a router setup that supports this first
@NgModule({
    imports: [UtilityModule, StudentDashboardModule, TeacherDashboardModule, AdminDashboardModule],
    declarations: [DashboardComponent],
    entryComponents: [DashboardComponent],
})
export class DashboardModule {}
