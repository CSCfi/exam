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
import { CalendarComponent } from './calendar/calendar.component';
import { StudentDashboardComponent } from './dashboard/student/student-dashboard.component';
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
    },
    {
        path: 'dashboard',
        component: StudentDashboardComponent,
    },
    {
        path: 'calendar/:id',
        component: CalendarComponent,
        data: {
            isExternal: false,
            isCollaborative: false,
        },
    },
    {
        path: 'iop/calendar/:id',
        component: CalendarComponent,
        data: { isExternal: true },
    },
    {
        path: 'collaborative/calendar/:id',
        component: CalendarComponent,
        data: { isExternal: false, isCollaborative: true },
    },
    {
        path: 'logout',
        component: LogoutComponent,
    },
    {
        path: 'student/exam/:hash',
        component: ExaminationComponent,
        data: {
            isPreview: false,
        },
    },
    {
        path: 'student/waiting-room/:id/:hash',
        component: WaitingRoomComponent,
    },
    {
        path: 'student/waiting-room',
        component: WaitingRoomComponent,
    },
    {
        path: 'student/wrong-room/:eid/:mid',
        component: WrongLocationComponent,
        data: {
            cause: 'room',
        },
    },
    {
        path: 'student/wrong-machine/:eid/:mid',
        component: WrongLocationComponent,
        data: {
            cause: 'machine',
        },
    },
    {
        path: 'student/exams',
        component: ExamSearchComponent,
    },
    {
        path: 'student/exams/collaborative',
        component: CollaborativeExamSearchComponent,
    },
    {
        path: 'student/participations',
        component: ExamParticipationsComponent,
    },
    {
        path: 'student/participations/collaborative',
        component: CollaborativeParticipationsComponent,
    },
    {
        path: 'student/logout',
        component: ExaminationLogoutComponent,
    },
    {
        path: 'enroll/exam/:id',
        component: ExamEnrolmentsComponent,
    },
    {
        path: 'staff',
        loadChildren: () => import('./dashboard/staff/staff-dashboard.module').then((mod) => mod.StaffDashboardModule),
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule {}
