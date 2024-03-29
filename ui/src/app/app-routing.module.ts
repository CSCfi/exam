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
import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { CalendarTitleResolverService } from './calendar/calendar-title-resolver.service';
import { CalendarComponent } from './calendar/calendar.component';
import { StudentDashboardComponent } from './dashboard/student/student-dashboard.component';
import { ExamEnrolmentTitleResolverService } from './enrolment/exams/exam-enrolment-title-resolver.service';
import { ExamEnrolmentsComponent } from './enrolment/exams/exam-enrolments.component';
import { CollaborativeParticipationsComponent } from './enrolment/finished/collaborative-exam-participations.component';
import { ExamParticipationsComponent } from './enrolment/finished/exam-participations.component';
import { CollaborativeExamSearchComponent } from './enrolment/search/collaborative-exam-search.component';
import { ExamSearchComponent } from './enrolment/search/exam-search.component';
import { WaitingRoomComponent } from './enrolment/waiting-room/waiting-room.component';
import { WrongLocationComponent } from './enrolment/wrong-location/wrong-location.component';
import { ExaminationComponent } from './examination/examination.component';
import { ExaminationLogoutComponent } from './examination/logout/examination-logout.component';
import { LogoutComponent } from './session/logout/logout.component';

const routes: Route[] = [
    {
        path: '',
        component: AppComponent,
        pathMatch: 'full',
        title: 'EXAM',
    },
    {
        path: 'dashboard',
        component: StudentDashboardComponent,
        title: 'EXAM',
    },
    {
        path: 'logout',
        component: LogoutComponent,
    },
    {
        path: 'exam/:hash',
        component: ExaminationComponent,
        data: {
            isPreview: false,
        },
        title: 'EXAM - examination',
    },
    {
        path: 'waitingroom/:id/:hash',
        component: WaitingRoomComponent,
        title: 'EXAM - waiting room',
    },
    {
        path: 'waitingroom',
        component: WaitingRoomComponent,
        title: 'EXAM - waiting room',
    },
    {
        path: 'wrongroom/:eid/:mid',
        component: WrongLocationComponent,
        data: {
            cause: 'room',
        },
        title: 'EXAM - wrong location',
    },
    {
        path: 'wrongmachine/:eid/:mid',
        component: WrongLocationComponent,
        data: {
            cause: 'machine',
        },
        title: 'EXAM - wrong machine',
    },
    {
        path: 'exams',
        component: ExamSearchComponent,
        title: 'EXAM - search',
    },
    {
        path: 'exams/collaborative',
        component: CollaborativeExamSearchComponent,
        title: 'EXAM - search',
    },
    {
        path: 'participations',
        component: ExamParticipationsComponent,
        title: 'EXAM - participations',
    },
    {
        path: 'participations/collaborative',
        component: CollaborativeParticipationsComponent,
        title: 'EXAM - participations',
    },
    {
        path: 'examination/logout',
        component: ExaminationLogoutComponent,
        title: 'EXAM - logout',
    },
    {
        path: 'enrolments/:id',
        component: ExamEnrolmentsComponent,
        title: ExamEnrolmentTitleResolverService,
    },
    {
        path: 'calendar/:id',
        component: CalendarComponent,
        data: {
            isExternal: false,
            isCollaborative: false,
        },
        title: CalendarTitleResolverService,
    },
    {
        path: 'calendar/:id/external',
        component: CalendarComponent,
        data: { isExternal: true },
        title: 'EXAM - calendar',
    },
    {
        path: 'calendar/:id/collaborative',
        component: CalendarComponent,
        data: { isExternal: false, isCollaborative: true },
        title: 'EXAM - calendar',
    },
    /*
     { // this does not work apparently because admin code uses some of calendar dependencies
-        path: 'calendar',
-        loadChildren: () => import('./calendar/calendar.module').then((mod) => mod.CalendarModule),
-    },
    */
    {
        path: 'staff',
        loadChildren: () => import('./dashboard/staff/staff-dashboard.module').then((mod) => mod.StaffDashboardModule),
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { enableTracing: false })],
    exports: [RouterModule],
})
export class AppRoutingModule {}
