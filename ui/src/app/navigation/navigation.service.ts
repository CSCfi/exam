// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { Link } from './navigation.model';

@Injectable({ providedIn: 'root' })
export class NavigationService {
    private http = inject(HttpClient);
    private router = inject(Router);
    private Session = inject(SessionService);

    getAppVersion$ = () => this.http.get<{ appVersion: string }>('/app/settings/appVersion');

    getInteroperability$ = () =>
        this.http.get<{ isExamCollaborationSupported: boolean }>('/app/settings/iop/examCollaboration');

    getByodSupport$ = () =>
        this.http.get<{ homeExaminationSupported: boolean; sebExaminationSupported: boolean }>('/app/settings/byod');

    getLinks(interoperable: boolean, hasByod: boolean): Link[] {
        const user: User = this.Session.getUser();

        if (!user) {
            return [];
        }

        const admin = user.isAdmin;
        const student = user.isStudent;
        const teacher = user.isTeacher;
        const support = user.isSupport;
        const languageInspector = user.isTeacher && user.isLanguageInspector;

        // Do not show if waiting for exam to begin
        const hidden = /waitingroom|wrongmachine|wrongroom|early/.test(this.router.url);

        // Change the menu item title if student
        const nameForDashboard = student ? 'i18n_user_enrolled_exams_title' : 'i18n_dashboard';

        const collaborativeExamsSubmenu = {
            hidden: true,
            items: [
                {
                    route: student ? 'exams/collaborative' : 'staff/collaborative',
                    visible: !support,
                    name: 'i18n_collaborative_exams',
                    iconPng: 'icon_admin_exams.png',
                    submenu: { hidden: true, items: [] },
                },
            ],
        };

        const teacherCollaborativeExamsSubmenu =
            teacher && interoperable
                ? collaborativeExamsSubmenu
                : {
                      hidden: true,
                      items: [],
                      submenu: { hidden: true, items: [] },
                  };
        const studentCollaborativeExamsSubmenu =
            student && interoperable
                ? collaborativeExamsSubmenu
                : {
                      hidden: true,
                      items: [],
                      submenu: { hidden: true, items: [] },
                  };
        const dashboardRoute = student ? 'dashboard' : admin || support ? 'staff/admin' : 'staff/teacher';
        return [
            {
                route: dashboardRoute,
                visible: !hidden,
                name: nameForDashboard,
                iconPng: 'icon_enrols.svg',
                submenu: teacherCollaborativeExamsSubmenu,
            },
            {
                route: 'staff/inspections',
                visible: languageInspector,
                name: 'i18n_language_inspections',
                iconPng: 'icon_admin_lang_inspection.png',
                submenu: { hidden: true, items: [] },
            },
            {
                route: 'staff/adminexams',
                visible: admin || support,
                name: 'i18n_exams',
                iconPng: 'icon_admin_exams.png',
                submenu: {
                    hidden: true,
                    items: [
                        {
                            route: 'staff/inspections',
                            visible: admin,
                            name: 'i18n_language_inspections',
                            iconPng: 'icon_admin_lang_inspection.png',
                            submenu: { hidden: true, items: [] },
                        },
                        {
                            route: 'staff/printouts',
                            visible: admin,
                            name: 'i18n_printout_exams',
                            iconPng: 'icon_printouts.png',
                            submenu: { hidden: true, items: [] },
                        },
                        {
                            route: 'staff/collaborative',
                            visible: admin && interoperable,
                            name: 'i18n_collaborative_exams',
                            iconPng: 'icon_admin_exams.png',
                            submenu: { hidden: true, items: [] },
                        },
                        {
                            route: 'staff/examinationevents',
                            visible: admin && hasByod,
                            name: 'i18n_byod_exams',
                            iconPng: 'icon_admin_exams.png',
                            submenu: { hidden: true, items: [] },
                        },
                        {
                            route: 'staff/questions',
                            visible: admin,
                            name: 'i18n_library_new',
                            iconPng: 'icon_questions.png',
                            submenu: { hidden: true, items: [] },
                        },
                    ],
                },
            },
            {
                route: 'staff/rooms',
                visible: admin,
                name: 'i18n_exam_rooms',
                iconPng: 'icon_administration.png',
                submenu: {
                    hidden: true,
                    items: [
                        {
                            route: 'staff/reports',
                            visible: true,
                            name: 'i18n_reports',
                            iconPng: 'icon_reports.png',
                            submenu: { hidden: true, items: [] },
                        },
                        {
                            route: 'staff/statistics',
                            visible: true,
                            name: 'i18n_statistics',
                            iconPng: 'icon_statistics.png',
                            submenu: { hidden: true, items: [] },
                        },
                        {
                            route: 'staff/settings',
                            visible: true,
                            name: 'i18n_settings',
                            iconPng: 'icon_settings.png',
                            submenu: { hidden: true, items: [] },
                        },
                    ],
                },
            },
            {
                route: 'staff/users',
                visible: admin || support,
                name: 'i18n_users',
                iconPng: 'icon_users.png',
                submenu: {
                    hidden: true,
                    items: [],
                },
            },
            {
                route: 'staff/questions',
                visible: teacher,
                name: 'i18n_library_new',
                iconPng: 'icon_questions.png',
                submenu: {
                    hidden: true,
                    items: [],
                },
            },
            {
                route: 'staff/reservations',
                visible: teacher,
                name: 'i18n_reservations_new',
                iconSvg: 'icon_reservations.svg',
                iconPng: 'icon_reservations.png',
                submenu: {
                    hidden: true,
                    items: [],
                },
            },
            {
                route: 'exams',
                visible: student && !hidden,
                name: 'i18n_exams',
                iconPng: 'icon_exams.png',
                submenu: studentCollaborativeExamsSubmenu,
            },
            {
                route: 'participations',
                visible: student && !hidden,
                name: 'i18n_exam_responses',
                iconPng: 'icon_finished.png',
                submenu: {
                    hidden: true,
                    items: [
                        {
                            route: 'participations/collaborative',
                            visible: true,
                            name: 'i18n_collaborative_exam_responses',
                            iconPng: 'icon_finished.png',
                            submenu: { hidden: true, items: [] },
                        },
                    ],
                },
            },
            {
                route: 'logout',
                visible: true,
                name: 'i18n_logout',
                iconPng: 'icon_admin_logout.png',
                submenu: {
                    hidden: true,
                    items: [],
                },
            },
        ];
    }
}
