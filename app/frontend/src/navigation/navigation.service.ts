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
import { StateService } from '@uirouter/core';
import { Observable } from 'rxjs';

import { SessionService, User } from '../session/session.service';

export interface Link {
    state: string;
    visible: boolean;
    name: string;
    iconSvg?: string;
    iconPng?: string;
    submenu?: { hidden: boolean; items: Link[] };
}

@Injectable()
export class NavigationService {
    constructor(private http: HttpClient, private state: StateService, private Session: SessionService) {}

    getAppVersion(): Observable<{ appVersion: string }> {
        return this.http.get<{ appVersion: string }>('/app/settings/appVersion');
    }

    getInteroperability(): Observable<{ isExamCollaborationSupported: boolean }> {
        return this.http.get<{ isExamCollaborationSupported: boolean }>('/app/settings/iop/examCollaboration');
    }

    getLinks(interoperable: boolean): Link[] {
        const user: User = this.Session.getUser();

        if (!user) {
            return [];
        }

        const admin = user.isAdmin;
        const student = user.isStudent;
        const teacher = user.isTeacher;
        const languageInspector = user.isTeacher && user.isLanguageInspector;

        // Do not show if waiting for exam to begin
        const regex = /\/student\/waiting-room|wrong-machine|wrong-room/;
        const hideDashboard = regex.test(this.state.current.url as string);

        // Change the menu item title if student
        const nameForDashboard = student ? 'sitnet_user_enrolled_exams_title' : 'sitnet_dashboard';

        const collaborativeExamsSubmenu = {
            hidden: true,
            items: [
                {
                    state: student ? 'collaborativeExamSearch' : 'collaborativeExams',
                    visible: true,
                    name: 'sitnet_collaborative_exams',
                    iconPng: 'icon_admin_exams.png',
                },
            ],
        };

        const teacherCollaborativeExamsSubmenu =
            teacher && interoperable
                ? collaborativeExamsSubmenu
                : {
                      hidden: true,
                      items: [],
                  };
        const studentCollaborativeExamsSubmenu =
            student && interoperable
                ? collaborativeExamsSubmenu
                : {
                      hidden: true,
                      items: [],
                  };

        return [
            {
                state: 'dashboard',
                visible: !hideDashboard,
                name: nameForDashboard,
                iconPng: 'icon_enrols.svg',
                submenu: teacherCollaborativeExamsSubmenu,
            },
            {
                state: 'languageInspections',
                visible: languageInspector,
                name: 'sitnet_language_inspections',
                iconPng: 'icon_admin_lang_inspection.png',
                submenu: {
                    hidden: true,
                    items: [],
                },
            },
            {
                state: 'exams',
                visible: admin,
                name: 'sitnet_exams',
                iconPng: 'icon_admin_exams.png',
                submenu: {
                    hidden: true,
                    items: [
                        {
                            state: 'languageInspections',
                            visible: true,
                            name: 'sitnet_language_inspections',
                            iconPng: 'icon_admin_lang_inspection.png',
                        },
                        {
                            state: 'printouts',
                            visible: true,
                            name: 'sitnet_printout_exams',
                            iconPng: 'icon_printouts.png',
                        },
                        {
                            state: 'collaborativeExams',
                            visible: interoperable,
                            name: 'sitnet_collaborative_exams',
                            iconPng: 'icon_admin_exams.png',
                        },
                        {
                            state: 'library',
                            visible: true,
                            name: 'sitnet_library_new',
                            iconPng: 'icon_questions.png',
                        },
                    ],
                },
            },
            {
                state: 'rooms',
                visible: admin,
                name: 'sitnet_exam_rooms',
                iconPng: 'icon_administration.png',
                submenu: {
                    hidden: true,
                    items: [
                        {
                            state: 'reports',
                            visible: true,
                            name: 'sitnet_reports',
                            iconPng: 'icon_reports.png',
                        },
                        {
                            state: 'statistics',
                            visible: true,
                            name: 'sitnet_statistics',
                            iconPng: 'icon_statistics.png',
                        },
                        {
                            state: 'settings',
                            visible: true,
                            name: 'sitnet_settings',
                            iconPng: 'icon_settings.png',
                        },
                    ],
                },
            },
            {
                state: 'users',
                visible: admin,
                name: 'sitnet_users',
                iconPng: 'icon_users.png',
                submenu: {
                    hidden: true,
                    items: [],
                },
            },
            {
                state: 'library',
                visible: teacher,
                name: 'sitnet_library_new',
                iconPng: 'icon_questions.png',
                submenu: {
                    hidden: true,
                    items: [],
                },
            },
            {
                state: 'reservations',
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
                state: 'examSearch',
                visible: student && !hideDashboard,
                name: 'sitnet_exams',
                iconPng: 'icon_exams.png',
                submenu: studentCollaborativeExamsSubmenu,
            },
            {
                state: 'participations',
                visible: student && !hideDashboard,
                name: 'sitnet_exam_responses',
                iconPng: 'icon_finished.png',
                submenu: {
                    hidden: true,
                    items: [
                        {
                            state: 'collaborativeParticipations',
                            visible: true,
                            name: 'sitnet_collaborative_exam_responses',
                            iconPng: 'icon_finished.png',
                        },
                    ],
                },
            },
            {
                state: 'logout',
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
