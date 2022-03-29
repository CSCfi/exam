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
import type { Ng2StateDeclaration, UIRouter } from '@uirouter/angular';
import { UIRouterModule } from '@uirouter/angular';
import { AppComponent } from './app.component';
import { CalendarComponent } from './calendar/calendar.component';
import { StudentDashboardComponent } from './dashboard/student/studentDashboard.component';
import { ExamEnrolmentsComponent } from './enrolment/exams/examEnrolments.component';
import { CollaborativeParticipationsComponent } from './enrolment/finished/collaborativeExamParticipations.component';
import { ExamParticipationsComponent } from './enrolment/finished/examParticipations.component';
import { CollaborativeExamSearchComponent } from './enrolment/search/collaborativeExamSearch.component';
import { ExamSearchComponent } from './enrolment/search/examSearch.component';
import { WaitingRoomComponent } from './enrolment/waiting-room/waitingRoom.component';
import { WrongLocationComponent } from './enrolment/wrong-location/wrongLocation.component';
import { ExaminationComponent } from './examination/examination.component';
import { ExaminationLogoutComponent } from './examination/logout/examinationLogout.component';
import { LogoutComponent } from './session/logout/logout.component';

function uiRouterConfigFn(router: UIRouter) {
    // Configure the initial state
    // If the browser URL doesn't matches any state when the router starts,
    // go to the `dashboard` state by default
    router.urlService.rules.initial({ state: 'app' });

    // Use @uirouter/visualizer to show the states and transitions
    // visualizer(router);
}

const studentStates: Ng2StateDeclaration[] = [
    { name: 'app', url: '', component: AppComponent },
    { name: 'dashboard', url: '/dashboard', component: StudentDashboardComponent },
    {
        name: 'calendar',
        url: '/calendar/:id?{selected}',
        component: CalendarComponent,
        resolve: [
            {
                token: 'isExternal',
                resolveFn: () => false,
            },
            {
                token: 'isCollaborative',
                resolveFn: () => false,
            },
        ],
    },
    {
        name: 'externalCalendar',
        url: '/iop/calendar/:id?{selected}&{isCollaborative}',
        component: CalendarComponent,
        resolve: {
            isExternal: () => true,
        },
    },
    {
        name: 'collaborativeCalendar',
        url: 'collaborative/calendar/:id',
        component: CalendarComponent,
        resolve: {
            isExternal: () => false,
            isCollaborative: () => true,
        },
    },
    {
        name: 'logout',
        url: '/logout',
        component: LogoutComponent,
    },
    {
        name: 'examination',
        url: '/student/exam/:hash',
        component: ExaminationComponent,
        resolve: {
            isPreview: () => false,
        },
    },
    {
        name: 'waitingRoom',
        url: '/student/waiting-room/:id/:hash',
        component: WaitingRoomComponent,
    },
    {
        name: 'waitingRoomNoExam',
        url: '/student/waiting-room',
        component: WaitingRoomComponent,
    },
    {
        name: 'wrongRoom',
        url: '/student/wrong-room/:eid/:mid',
        component: WrongLocationComponent,
        resolve: {
            cause: () => 'room',
        },
    },
    {
        name: 'wrongMachine',
        url: '/student/wrong-room/:eid/:mid',
        component: WrongLocationComponent,
        resolve: {
            cause: () => 'machine',
        },
    },
    {
        name: 'examSearch',
        url: '/student/exams',
        component: ExamSearchComponent,
    },
    {
        name: 'collaborativeExamSearch',
        url: '/student/exams/collaborative',
        component: CollaborativeExamSearchComponent,
    },
    {
        name: 'participations',
        url: '/student/participations',
        component: ExamParticipationsComponent,
    },
    {
        name: 'collaborativeParticipations',
        url: '/student/participations/collaborative',
        component: CollaborativeParticipationsComponent,
    },
    {
        name: 'examinationLogout',
        url: '/student/logout?{reason}&{quitLinkEnabled}',
        component: ExaminationLogoutComponent,
    },
    {
        name: 'enrolments',
        url: '/enroll/exam/:id?{code}',
        component: ExamEnrolmentsComponent,
    },
];

const staffFutureStates: Ng2StateDeclaration[] = [
    {
        name: 'staff.**',
        url: '/staff',
        loadChildren: () => import('./dashboard/staff/staffDashboard.module').then((mod) => mod.StaffDashboardModule),
    },
];

const appStates: Ng2StateDeclaration[] = studentStates.concat(staffFutureStates);
@NgModule({
    imports: [UIRouterModule.forRoot({ states: appStates, useHash: false, config: uiRouterConfigFn })],
    exports: [UIRouterModule],
})
export class AppRoutingModule {}
