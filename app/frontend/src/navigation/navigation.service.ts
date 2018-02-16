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
    faClass: string;
    name: string;
    iconSvg?: string;
    iconPng?: string;
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

    getLinks(): Link[] {
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
                faClass: 'fa-home',
                name: nameForDashboard,
                iconSvg: 'icon_enrols.svg',
                iconPng: 'icon_enrols.png'
            },
            {
                href: '/inspections',
                visible: (languageInspector || admin),
                faClass: 'fa-language',
                name: 'sitnet_language_inspections',
                iconSvg: 'icon_language_inspection.svg',
                iconPng: 'icon_language_inspection.png'
            },
            {
                href: '/exams',
                visible: (admin),
                faClass: 'fa-paste',
                name: 'sitnet_exams',
                iconSvg: 'icon_enrols.svg',
                iconPng: 'icon_enrols.png'
            },
            {
                href: '/printouts',
                visible: (admin),
                faClass: 'fa-print',
                name: 'sitnet_printout_exams'
            },
            {
                href: '/rooms',
                visible: (admin),
                faClass: 'fa-building-o',
                name: 'sitnet_exam_rooms',
                iconSvg: 'icon_enrols.svg',
                iconPng: 'icon_enrols.png'
            },
            {
                href: '/reports',
                visible: (admin),
                faClass: 'fa-files-o',
                name: 'sitnet_reports',
                iconSvg: 'icon_enrols.svg',
                iconPng: 'icon_enrols.png'
            },
            {
                href: '/statistics',
                visible: (admin),
                faClass: 'fa-line-chart',
                name: 'sitnet_statistics',
                iconSvg: 'icon_enrols.svg',
                iconPng: 'icon_enrols.png'
            },
            {
                href: '/settings',
                visible: (admin),
                faClass: 'fa-wrench',
                name: 'sitnet_settings',
                iconSvg: 'icon_enrols.svg',
                iconPng: 'icon_enrols.png'
            },
            {
                href: '/users',
                visible: (admin),
                faClass: 'fa-users',
                name: 'sitnet_users',
                iconSvg: 'icon_reservations.svg',
                iconPng: 'icon_reservations.png'
            },
            {
                href: '/questions',
                visible: (admin || teacher),
                faClass: 'fa-list-ol',
                name: 'sitnet_library_new',
                iconSvg: 'icon_pencil.svg',
                iconPng: 'icon_pencil.png'
            },
            {
                href: '/reservations',
                visible: (teacher),
                faClass: 'fa-clock-o',
                name: 'sitnet_reservations_new',
                iconSvg: 'icon_reservations.svg',
                iconPng: 'icon_reservations.png'
            },
            {
                href: '/student/exams',
                visible: (student && !hideDashboard),
                faClass: 'fa-search',
                name: 'sitnet_exams',
                iconSvg: 'icon_exams.svg',
                iconPng: 'icon_exams.png'
            },
            {
                href: '/student/participations',
                visible: (student && !hideDashboard),
                faClass: 'fa-search',
                name: 'sitnet_exam_responses',
                iconSvg: 'icon_finished.svg',
                iconPng: 'icon_finished.png'
            },
            {
                href: '/logout',
                visible: (student || admin || teacher),
                faClass: 'fa-sign-out',
                name: 'sitnet_logout',
                iconSvg: 'icon_logout.svg',
                iconPng: 'icon_logout.png'
            }
        ];
    }


}
