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
import { inject, NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';
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

const buildTitle = (key: string, extraPart = ''): Observable<string> => {
    const tx = inject(TranslateService);
    const extra = extraPart ? ` ${extraPart}` : '';
    return tx.get(key).pipe(map(() => `${tx.instant(key)}${extra} - EXAM`));
};

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
        title: () => buildTitle('sitnet_enrolments_title'),
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
        title: () => buildTitle('sitnet_examination_title'),
    },
    {
        path: 'waitingroom/:id/:hash',
        component: WaitingRoomComponent,
        title: () => buildTitle('sitnet_waiting_room_title'),
    },
    {
        path: 'waitingroom',
        component: WaitingRoomComponent,
        title: () => buildTitle('sitnet_waiting_room_title'),
    },
    {
        path: 'wrongroom/:eid/:mid',
        component: WrongLocationComponent,
        data: {
            cause: 'room',
        },
        title: () => buildTitle('sitnet_wrong_room_title'),
    },
    {
        path: 'wrongmachine/:eid/:mid',
        component: WrongLocationComponent,
        data: {
            cause: 'machine',
        },
        title: () => buildTitle('sitnet_wrong_machine_title'),
    },
    {
        path: 'exams',
        component: ExamSearchComponent,
        title: () => buildTitle('sitnet_exams_title'),
    },
    {
        path: 'exams/collaborative',
        component: CollaborativeExamSearchComponent,
        title: () => buildTitle('sitnet_collaborative_exams_title'),
    },
    {
        path: 'participations',
        component: ExamParticipationsComponent,
        title: () => buildTitle('sitnet_participations_title'),
    },
    {
        path: 'participations/collaborative',
        component: CollaborativeParticipationsComponent,
        title: () => buildTitle('sitnet_collaborative_participations_title'),
    },
    {
        path: 'examination/logout',
        component: ExaminationLogoutComponent,
        title: () => buildTitle('sitnet_examination_logout_title'),
    },
    {
        path: 'enrolments/:id',
        component: ExamEnrolmentsComponent,
        title: (route) => buildTitle('sitnet_enrolment_title', `#${route.params.id}`),
    },
    {
        path: 'calendar/:id',
        component: CalendarComponent,
        data: {
            isExternal: false,
            isCollaborative: false,
        },
        title: (route) => buildTitle('sitnet_reservation_title', `#${route.params.id}`),
    },
    {
        path: 'calendar/:id/external',
        component: CalendarComponent,
        data: { isExternal: true },
        title: (route) => buildTitle('sitnet_external_reservation_title', `#${route.params.id}`),
    },
    {
        path: 'calendar/:id/collaborative',
        component: CalendarComponent,
        data: { isExternal: false, isCollaborative: true },
        title: (route) => buildTitle('sitnet_collaborative_reservation_title', `#${route.params.id}`),
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
