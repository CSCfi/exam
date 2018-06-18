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

import * as angular from 'angular';
import { SessionService, User } from '../session/session.service';

export interface Link {
    href: string;
    visible: boolean;
    name: string;
    iconSvg?: string;
    iconPng?: string;
    submenu?: { hidden: boolean, items: Link[] };
}

export class NavigationService {

    constructor(
        private $http: angular.IHttpService,
        private $location: angular.ILocationService,
        private Session: SessionService) {
        'ngInject';
    }

    getAppVersion(): angular.IHttpPromise<{ appVersion: string }> {
        return this.$http.get('/app/settings/appVersion');
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
        const hideDashboard = /\/student\/waiting-room|wrong-machine|wrong-room/.test(this.$location.path());

        // Change the menu item title if student
        const nameForDashboard = student ? 'sitnet_user_enrolled_exams_title' : 'sitnet_dashboard';

        return [
            {
                href: '/',
                visible: !hideDashboard,
                name: nameForDashboard,
                iconPng: 'icon_desktop.png'
            },
            {
                href: '/inspections',
                visible: (languageInspector),
                name: 'sitnet_language_inspections',
                iconPng: 'icon_admin_lang_inspection.png'
            },
            {
                href: '/exams',
                visible: (admin),
                name: 'sitnet_exams',
                iconPng: 'icon_admin_exams.png',
                submenu: {
                    hidden: true,
                    items: [
                        {
                            href: '/inspections',
                            visible: (admin),
                            name: 'sitnet_language_inspections',
                            iconPng: 'icon_admin_lang_inspection.png'
                        },
                        {
                            href: '/printouts',
                            visible: (admin),
                            name: 'sitnet_printout_exams',
                            iconPng: 'icon_printouts.png'
                        },
                        {
                            href: '/exams/collaborative',
                            visible: (admin && interoperable),
                            name: 'sitnet_collaborative_exams',
                            iconPng: 'icon_admin_exams.png'
                        },
                        {
                            href: '/questions',
                            visible: (admin),
                            name: 'sitnet_library_new',
                            iconPng: 'icon_questions.png'
                        }
                    ]
                }
            },
            {
                href: '/rooms',
                visible: (admin),
                name: 'sitnet_exam_rooms',
                iconPng: 'icon_administration.png',
                submenu: {
                    hidden: true,
                    items: [
                        {
                            href: '/reports',
                            visible: (admin),
                            name: 'sitnet_reports',
                            iconPng: 'icon_reports.png'
                        },
                        {
                            href: '/statistics',
                            visible: (admin),
                            name: 'sitnet_statistics',
                            iconPng: 'icon_statistics.png'
                        },
                        {
                            href: '/settings',
                            visible: (admin),
                            name: 'sitnet_settings',
                            iconPng: 'icon_settings.png'
                        }
                    ]
                }
            },
            {
                href: '/users',
                visible: (admin),
                name: 'sitnet_users',
                iconPng: 'icon_users.png'
            },
            {
                href: '/questions',
                visible: (teacher),
                name: 'sitnet_library_new',
                iconPng: 'icon_questions.png'
            },
            {
                href: '/reservations',
                visible: (teacher),
                name: 'sitnet_reservations_new',
                iconSvg: 'icon_reservations.svg',
                iconPng: 'icon_reservations.png'
            },
            {
                href: '/student/exams',
                visible: (student && !hideDashboard),
                name: 'sitnet_exams',
                iconPng: 'icon_exams.png'
            },
            {
                href: '/student/participations',
                visible: (student && !hideDashboard),
                name: 'sitnet_exam_responses',
                iconPng: 'icon_finished.png'
            },
            {
                href: '/logout',
                visible: (student || admin || teacher),
                name: 'sitnet_logout',
                iconPng: 'icon_admin_logout.png'
            }
        ];
    }
}
