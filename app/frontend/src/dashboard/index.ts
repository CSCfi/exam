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

import * as angular from 'angular';
import ReservationModule from '../reservation'; // TODO: make a proper exportable module
import { DashboardComponent } from './dashboard.component';
import { StudentDashboardComponent } from './student/studentDashboard.component';
import { StudentDashboardService } from './student/studentDashboard.service';
import { ExamListCategoryComponent } from './teacher/categories/examListCategory.component';
import { TeacherDashboardComponent } from './teacher/teacherDashboard.component';
import { TeacherDashboardService } from './teacher/teacherDashboard.service';
import { downgradeComponent, downgradeInjectable } from '@angular/upgrade/static';


require('../exam/editor'); // TODO: make a proper exportable module


export default angular.module('app.dashboard', [ReservationModule, 'app.exam'])
    .service('StudentDashboard', StudentDashboardService)
    .service('TeacherDashboard', downgradeInjectable(TeacherDashboardService))
    .component('dashboard', DashboardComponent)
    .component('studentDashboard', StudentDashboardComponent)
    .directive('examListCategory', downgradeComponent({ component: ExamListCategoryComponent }))
    .directive('teacherDashboard', downgradeComponent({ component: TeacherDashboardComponent }))
    .name;
