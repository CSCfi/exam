// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';
import { AppComponent } from './app.component';
import { LogoutComponent } from './session/logout/logout.component';

const buildTitle = (key: string, extraPart = ''): Observable<string> => {
    const tx = inject(TranslateService);
    const extra = extraPart ? ` ${extraPart}` : '';
    return tx.get(key).pipe(map(() => `${tx.instant(key)}${extra} - EXAM`));
};

export const APP_ROUTES: Route[] = [
    {
        path: '',
        component: AppComponent,
        pathMatch: 'full',
        title: () => buildTitle('i18n_login_title'),
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('./dashboard/student/student-dashboard.component').then((mod) => mod.StudentDashboardComponent),
        title: () => buildTitle('i18n_enrolments_title'),
    },
    {
        path: 'logout',
        component: LogoutComponent,
        title: () => buildTitle('i18n_logout_title'),
    },
    {
        path: 'exam/:hash',
        data: {
            isPreview: false,
        },
        loadComponent: () => import('./examination/examination.component').then((mod) => mod.ExaminationComponent),
        title: () => buildTitle('i18n_examination_title'),
    },
    {
        path: 'waitingroom/:id/:hash',
        loadComponent: () =>
            import('./enrolment/waiting-room/waiting-room.component').then((mod) => mod.WaitingRoomComponent),
        title: () => buildTitle('i18n_waiting_room_title'),
    },
    {
        path: 'waitingroom',
        loadComponent: () =>
            import('./enrolment/waiting-room/waiting-room.component').then((mod) => mod.WaitingRoomComponent),
        title: () => buildTitle('i18n_waiting_room_title'),
    },
    {
        path: 'early/:id/:hash',
        loadComponent: () =>
            import('./enrolment/waiting-room/waiting-room-early.component').then(
                (mod) => mod.WaitingRoomEarlyComponent,
            ),
        title: () => buildTitle('i18n_waiting_room_title'),
    },
    {
        path: 'unknownlocation/:eid',
        loadComponent: () =>
            import('./enrolment/wrong-location/unknown-location.component').then((mod) => mod.UnknownLocationComponent),
        title: () => buildTitle('i18n_wrong_machine_title'),
    },
    {
        path: 'wrongroom/:eid/:mid',
        loadComponent: () =>
            import('./enrolment/wrong-location/wrong-location.component').then((mod) => mod.WrongLocationComponent),
        data: {
            cause: 'room',
        },
        title: () => buildTitle('i18n_wrong_room_title'),
    },
    {
        path: 'wrongmachine/:eid/:mid',
        loadComponent: () =>
            import('./enrolment/wrong-location/wrong-location.component').then((mod) => mod.WrongLocationComponent),
        data: {
            cause: 'machine',
        },
        title: () => buildTitle('i18n_wrong_machine_title'),
    },
    {
        path: 'exams',
        loadComponent: () =>
            import('./enrolment/search/exam-search-tabs.component').then((mod) => mod.ExamSearchTabsComponent),
        title: () => buildTitle('i18n_exams_title'),
    },
    {
        path: 'participations',
        loadComponent: () =>
            import('./enrolment/finished/exam-participations.component').then((mod) => mod.ExamParticipationsComponent),
        title: () => buildTitle('i18n_participations_title'),
    },
    {
        path: 'participations/collaborative',
        loadComponent: () =>
            import('./enrolment/finished/collaborative-exam-participations.component').then(
                (mod) => mod.CollaborativeParticipationsComponent,
            ),
        title: () => buildTitle('i18n_collaborative_participations_title'),
    },
    {
        path: 'examination/logout',
        loadComponent: () =>
            import('./examination/logout/examination-logout.component').then((mod) => mod.ExaminationLogoutComponent),
        title: () => buildTitle('i18n_examination_logout_title'),
    },
    {
        path: 'enrolments/:id',
        loadComponent: () =>
            import('./enrolment/exams/exam-enrolments.component').then((mod) => mod.ExamEnrolmentsComponent),
        title: () => buildTitle('i18n_enrolment_title'),
    },
    {
        path: 'calendar/:id',
        loadComponent: () => import('./calendar/calendar.component').then((mod) => mod.CalendarComponent),
        data: {
            isExternal: false,
            isCollaborative: false,
        },
        title: () => buildTitle('i18n_reservation_title'),
    },
    {
        path: 'calendar/:id/external',
        loadComponent: () => import('./calendar/calendar.component').then((mod) => mod.CalendarComponent),
        data: {
            isExternal: true,
        },
        title: () => buildTitle('i18n_external_reservation_title'),
    },
    {
        path: 'calendar/:id/collaborative',
        loadComponent: () => import('./calendar/calendar.component').then((mod) => mod.CalendarComponent),
        data: {
            isExternal: false,
            isCollaborative: true,
        },
        title: () => buildTitle('i18n_collaborative_reservation_title'),
    },
    {
        path: 'staff',
        loadChildren: () => import('./dashboard/staff/staff.routes').then((mod) => mod.STAFF_ROUTES),
    },
];
