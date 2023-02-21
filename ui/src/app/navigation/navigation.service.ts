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
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import type { User } from '../session/session.service';
import { SessionService } from '../session/session.service';

export interface Link {
    route: string;
    visible: boolean;
    name: string;
    iconSvg?: string;
    iconPng?: string;
    submenu: { hidden: boolean; items: Link[] };
}

@Injectable({ providedIn: 'root' })
export class NavigationService {
    constructor(private http: HttpClient, private router: Router, private Session: SessionService) {}

    getAppVersion$ = () => this.http.get<{ appVersion: string }>('/app/settings/appVersion');

    getInteroperability$ = () =>
        this.http.get<{ isExamCollaborationSupported: boolean }>('/app/settings/iop/examCollaboration');

    getByodSupport$ = () => this.http.get<{ isByodExaminationSupported: boolean }>('/app/settings/byod');

    getLinks(interoperable: boolean, hasByod: boolean): Link[] {
        const user: User = this.Session.getUser();

        if (!user) {
            return [];
        }

        const admin = user.isAdmin;
        const student = user.isStudent;
        const teacher = user.isTeacher;
        const languageInspector = user.isTeacher && user.isLanguageInspector;

        // Do not show if waiting for exam to begin
        const regex = /waitingroom|wrongmachine|wrongroom/;
        const hideDashboard = regex.test(this.router.url);

        // Change the menu item title if student
        const nameForDashboard = student ? 'sitnet_user_enrolled_exams_title' : 'sitnet_dashboard';

        const collaborativeExamsSubmenu = {
            hidden: true,
            items: [
                {
                    route: student ? 'exams/collaborative' : 'staff/collaborative',
                    visible: true,
                    name: 'sitnet_collaborative_exams',
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

        return [
            {
                route: student ? 'dashboard' : admin ? 'staff/admin' : 'staff/teacher',
                visible: !hideDashboard,
                name: nameForDashboard,
                iconPng: 'icon_enrols.svg',
                submenu: teacherCollaborativeExamsSubmenu,
            },
            {
                route: 'staff/inspections',
                visible: languageInspector,
                name: 'sitnet_language_inspections',
                iconPng: 'icon_admin_lang_inspection.png',
                submenu: { hidden: true, items: [] },
            },
            {
                route: 'staff/adminexams',
                visible: admin,
                name: 'sitnet_exams',
                iconPng: 'icon_admin_exams.png',
                submenu: {
                    hidden: true,
                    items: [
                        {
                            route: 'staff/inspections',
                            visible: true,
                            name: 'sitnet_language_inspections',
                            iconPng: 'icon_admin_lang_inspection.png',
                            submenu: { hidden: true, items: [] },
                        },
                        {
                            route: 'staff/printouts',
                            visible: true,
                            name: 'sitnet_printout_exams',
                            iconPng: 'icon_printouts.png',
                            submenu: { hidden: true, items: [] },
                        },
                        {
                            route: 'staff/collaborative',
                            visible: interoperable,
                            name: 'sitnet_collaborative_exams',
                            iconPng: 'icon_admin_exams.png',
                            submenu: { hidden: true, items: [] },
                        },
                        {
                            route: 'staff/examinationevents',
                            visible: hasByod,
                            name: 'sitnet_byod_exams',
                            iconPng: 'icon_admin_exams.png',
                            submenu: { hidden: true, items: [] },
                        },
                        {
                            route: 'staff/questions',
                            visible: true,
                            name: 'sitnet_library_new',
                            iconPng: 'icon_questions.png',
                            submenu: { hidden: true, items: [] },
                        },
                    ],
                },
            },
            {
                route: 'staff/rooms',
                visible: admin,
                name: 'sitnet_exam_rooms',
                iconPng: 'icon_administration.png',
                submenu: {
                    hidden: true,
                    items: [
                        {
                            route: 'staff/reports',
                            visible: true,
                            name: 'sitnet_reports',
                            iconPng: 'icon_reports.png',
                            submenu: { hidden: true, items: [] },
                        },
                        {
                            route: 'staff/statistics',
                            visible: true,
                            name: 'sitnet_statistics',
                            iconPng: 'icon_statistics.png',
                            submenu: { hidden: true, items: [] },
                        },
                        {
                            route: 'staff/settings',
                            visible: true,
                            name: 'sitnet_settings',
                            iconPng: 'icon_settings.png',
                            submenu: { hidden: true, items: [] },
                        },
                    ],
                },
            },
            {
                route: 'staff/users',
                visible: admin,
                name: 'sitnet_users',
                iconPng: 'icon_users.png',
                submenu: {
                    hidden: true,
                    items: [],
                },
            },
            {
                route: 'staff/questions',
                visible: teacher,
                name: 'sitnet_library_new',
                iconPng: 'icon_questions.png',
                submenu: {
                    hidden: true,
                    items: [],
                },
            },
            {
                route: 'staff/reservations',
                visible: teacher,
                name: 'sitnet_reservations_new',
                iconSvg: 'icon_reservations.svg',
                iconPng: 'icon_reservations.png',
                submenu: {
                    hidden: true,
                    items: [],
                },
            },
            {
                route: 'exams',
                visible: student && !hideDashboard,
                name: 'sitnet_exams',
                iconPng: 'icon_exams.png',
                submenu: studentCollaborativeExamsSubmenu,
            },
            {
                route: 'participations',
                visible: student && !hideDashboard,
                name: 'sitnet_exam_responses',
                iconPng: 'icon_finished.png',
                submenu: {
                    hidden: true,
                    items: [
                        {
                            route: 'participations/collaborative',
                            visible: true,
                            name: 'sitnet_collaborative_exam_responses',
                            iconPng: 'icon_finished.png',
                            submenu: { hidden: true, items: [] },
                        },
                    ],
                },
            },
            {
                route: 'logout',
                visible: true,
                name: 'sitnet_logout',
                iconPng: 'icon_admin_logout.png',
                submenu: {
                    hidden: true,
                    items: [],
                },
            },
        ];
    }
}
