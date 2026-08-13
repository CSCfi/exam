// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { Link } from './navigation.model';

function dashboardRoute(user: User): string {
    if (user.isStudent) return 'dashboard';
    if (user.isAdmin || user.isSupport) return 'staff/admin';
    return 'staff/teacher';
}

@Injectable({ providedIn: 'root' })
export class NavigationService {
    private readonly http = inject(HttpClient);
    private readonly Session = inject(SessionService);

    getAppVersion$ = () => this.http.get<{ appVersion: string }>('/app/settings/appVersion');

    getInteroperability$ = () =>
        this.http.get<{ isExamCollaborationSupported: boolean }>('/app/settings/iop/examCollaboration');

    getByodSupport$ = () =>
        this.http.get<{ homeExaminationSupported: boolean; sebExaminationSupported: boolean }>('/app/settings/byod');

    getLinks(interoperable: boolean, hasByod: boolean, hideNav = false): Link[] {
        const user: User = this.Session.getUser();

        if (!user) {
            return [];
        }

        const admin = user.isAdmin;
        const student = user.isStudent;
        const teacher = user.isTeacher;
        const support = user.isSupport;
        const languageInspector = user.isTeacher && user.isLanguageInspector;

        const dashboardTitle = student ? 'i18n_user_enrolled_exams_title' : 'i18n_dashboard';

        const emptySubmenu = { hidden: true, items: [] };

        const collaborativeExamsSubmenu = {
            hidden: true,
            items: [
                {
                    route: 'staff/collaborative',
                    visible: true,
                    name: 'i18n_collaborative_exams',
                    iconPng: 'icon_admin_exams.png',
                    submenu: emptySubmenu,
                },
            ],
        };

        const teacherCollaborativeExamsSubmenu = teacher && interoperable ? collaborativeExamsSubmenu : emptySubmenu;
        return [
            {
                route: dashboardRoute(user),
                visible: !hideNav,
                name: dashboardTitle,
                iconPng: 'icon_enrols.svg',
                submenu: teacherCollaborativeExamsSubmenu,
            },
            {
                route: 'staff/inspections',
                visible: languageInspector,
                name: 'i18n_language_inspections',
                iconPng: 'icon_admin_lang_inspection.png',
                submenu: emptySubmenu,
            },
            {
                route: 'staff/admin/exams',
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
                            submenu: emptySubmenu,
                        },
                        {
                            route: 'staff/printouts',
                            visible: admin,
                            name: 'i18n_printout_exams',
                            iconPng: 'icon_printouts.png',
                            submenu: emptySubmenu,
                        },
                        {
                            route: 'staff/collaborative',
                            visible: admin && interoperable,
                            name: 'i18n_collaborative_exams',
                            iconPng: 'icon_admin_exams.png',
                            submenu: emptySubmenu,
                        },
                        {
                            route: 'staff/examinationevents',
                            visible: admin && hasByod,
                            name: 'i18n_byod_exams',
                            iconPng: 'icon_admin_exams.png',
                            submenu: emptySubmenu,
                        },
                        {
                            route: 'staff/questions',
                            visible: admin,
                            name: 'i18n_library_new',
                            iconPng: 'icon_questions.png',
                            submenu: emptySubmenu,
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
                            submenu: emptySubmenu,
                        },
                        {
                            route: 'staff/statistics',
                            visible: true,
                            name: 'i18n_statistics',
                            iconPng: 'icon_statistics.png',
                            submenu: emptySubmenu,
                        },
                        {
                            route: 'staff/settings',
                            visible: true,
                            name: 'i18n_settings',
                            iconPng: 'icon_settings.png',
                            submenu: emptySubmenu,
                        },
                    ],
                },
            },
            {
                route: 'staff/users',
                visible: admin || support,
                name: 'i18n_users',
                iconPng: 'icon_users.png',
                submenu: emptySubmenu,
            },
            {
                route: 'staff/questions',
                visible: teacher,
                name: 'i18n_library_new',
                iconPng: 'icon_questions.png',
                submenu: emptySubmenu,
            },
            {
                route: 'staff/reservations',
                visible: teacher,
                name: 'i18n_reservations_new',
                iconSvg: 'icon_reservations.svg',
                iconPng: 'icon_reservations.png',
                submenu: emptySubmenu,
            },
            {
                route: 'exams',
                visible: student && !hideNav,
                name: 'i18n_exams',
                iconPng: 'icon_exams.png',
                submenu: emptySubmenu,
            },
            {
                route: 'participations',
                visible: student && !hideNav,
                name: 'i18n_exam_responses',
                iconPng: 'icon_finished.png',
                submenu: {
                    hidden: true,
                    items: [
                        {
                            route: 'participations/collaborative',
                            visible: interoperable,
                            name: 'i18n_collaborative_exam_responses',
                            iconPng: 'icon_finished.png',
                            submenu: emptySubmenu,
                        },
                    ],
                },
            },
            {
                route: 'logout',
                visible: true,
                name: 'i18n_logout',
                iconPng: 'icon_admin_logout.png',
                submenu: emptySubmenu,
            },
        ];
    }
}
