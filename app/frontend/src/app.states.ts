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
import { StateProvider, UrlRouterProvider } from '@uirouter/angularjs';

export default function states($urlRouterProvider: UrlRouterProvider, $stateProvider: StateProvider) {
    'ngInject';

    // TODO: once we have full Angular migration done, we need to split these states across lazy loadable feature
    // modules.
    $stateProvider
        .state('app', { url: '/', component: 'examApp', redirectTo: 'dashboard' })
        .state('dashboard', { url: 'dashboard', component: 'dashboard', reloadOnSearch: false, parent: 'app' })
        .state('library', { url: 'questions', component: 'library', parent: 'app' })
        .state('question', {
            url: 'questions/{id}',
            component: 'question',
            parent: 'app',
            resolve: {
                newQuestion: () => false,
            },
        })
        .state('newQuestion', {
            url: 'questions/newQuestion',
            component: 'question',
            parent: 'app',
            resolve: {
                newQuestion: () => true,
            },
        })
        .state('newExam', { url: 'exams/new', component: 'newExam', parent: 'app' })
        .state('examEditor', { url: 'exams/{id}/{tab}', component: 'examTabs', parent: 'app' })
        .state('courseSelector', { url: 'exams/{id}/select/course', component: 'courseSelection', parent: 'app' })
        .state('examPreview', {
            url: 'exams/{id}/view/preview?tab',
            component: 'examination',
            parent: 'app',
            resolve: { isPreview: () => true },
        })
        .state('collaborativePreview', {
            url: 'exams/collaborative/{id}/view/preview?tab',
            component: 'examination',
            parent: 'app',
            resolve: {
                isPreview: () => true,
                isCollaborative: () => true,
            },
        })
        .state('printout', { url: 'exams/{id}/view/printout?tab', component: 'printout', parent: 'app' })
        .state('printouts', { url: 'printouts', component: 'printoutListing', parent: 'app' })
        .state('collaborativeExams', {
            url: 'exams/collaborative',
            component: 'collaborativeExamListing',
            parent: 'app',
        })
        .state('collaborativeExamEditor', {
            url: 'exams/collaborative/{id}/{tab}',
            component: 'examTabs',
            parent: 'app',
            resolve: {
                collaborative: () => true,
            },
        })
        .state('calendar', {
            url: 'calendar/{id}',
            component: 'calendar',
            parent: 'app',
            resolve: {
                isExternal: () => false,
                isCollaborative: () => false,
            },
        })
        .state('externalCalendar', {
            url: 'iop/calendar/{id}',
            component: 'calendar',
            parent: 'app',
            resolve: {
                isExternal: () => true,
                isCollaborative: () => false,
            },
        })
        .state('collaborativeCalendar', {
            url: 'calendar/collaborative/{id}',
            component: 'calendar',
            parent: 'app',
            resolve: {
                isExternal: () => false,
                isCollaborative: () => true,
            },
        })
        .state('logout', { url: 'logout', component: 'logout', parent: 'app' })
        .state('examination', {
            url: 'student/exam/{hash}',
            component: 'examination',
            parent: 'app',
            resolve: {
                isPreview: () => false,
            },
        })
        .state('waitingRoom', { url: 'student/waiting-room/{id}', component: 'waitingRoom', parent: 'app' })
        .state('waitingRoomNoExam', { url: 'student/waiting-room', component: 'waitingRoom', parent: 'app' })
        .state('wrongRoom', {
            url: 'student/wrong-room/{eid}/{mid}',
            component: 'wrongLocation',
            parent: 'app',
            resolve: {
                cause: () => 'room',
            },
        })
        .state('wrongMachine', {
            url: 'student/wrong-machine/{eid}/{mid}',
            component: 'wrongLocation',
            parent: 'app',
            resolve: {
                cause: () => 'machine',
            },
        })
        .state('examSearch', { url: 'student/exams', component: 'examSearch', parent: 'app' })
        .state('collaborativeExamSearch', {
            url: 'student/exams/collaborative',
            component: 'collaborativeExamSearch',
            parent: 'app',
        })
        .state('participations', { url: 'student/participations', component: 'examParticipations', parent: 'app' })
        .state('collaborativeParticipations', {
            url: 'student/participations/collaborative',
            component: 'collaborativeExamParticipations',
            parent: 'app',
        })
        .state('examinationLogout', {
            url: 'student/logout?reason&quitLinkEnabled',
            component: 'examinationLogout',
            parent: 'app',
        })
        .state('enrolments', { url: 'enroll/exam/{id}?{code}', component: 'examEnrolments', parent: 'app' })
        .state('assessment', {
            url: 'assessments/{id}',
            component: 'assessment',
            parent: 'app',
            resolve: {
                collaborative: () => false,
            },
        })
        .state('collaborativeAssessment', {
            url: 'assessments/collaborative/{id}/{ref}',
            component: 'assessment',
            parent: 'app',
            resolve: {
                collaborative: () => true,
            },
        })
        .state('speedReview', { url: 'speedreview/{id}', component: 'speedReview', parent: 'app' })
        .state('printedAssessment', {
            url: 'print/exam/{id}',
            component: 'printedAssessment',
            parent: 'app',
            resolve: {
                collaborative: () => false,
            },
        })
        .state('collaborativePrintedAssessment', {
            url: 'print/exam/{id}/{ref}',
            component: 'printedAssessment',
            parent: 'app',
            resolve: {
                collaborative: () => true,
            },
        })
        .state('questionAssessment', {
            url: 'assessments/{id}/questions',
            component: 'questionAssessment',
            parent: 'app',
        })
        .state('reservations', { url: 'reservations', component: 'teacherReservations', parent: 'app' })
        .state('examReservations', { url: 'reservations/{eid}', component: 'teacherReservations', parent: 'app' })
        .state('exams', { url: 'exams', component: 'examList', parent: 'app' })
        .state('rooms', { url: 'rooms', component: 'examRoomsAdminTabs', parent: 'app' })
        .state('room', { url: 'rooms/{id}', component: 'room', parent: 'app' })
        .state('availability', { url: 'rooms/{id}/availability', component: 'availability', parent: 'app' })
        .state('multiRoom', { url: 'rooms_edit/edit_multiple', component: 'multiRoom', parent: 'app' })
        .state('software', { url: 'softwares', component: 'software', parent: 'app' })
        .state('accessibility', { url: 'accessibility', component: 'accessibility', parent: 'app' })
        .state('machine', { url: 'machines/{id}', component: 'machine', parent: 'app' })
        .state('reports', { url: 'reports', component: 'reports', parent: 'app' })
        .state('statistics', { url: 'statistics', component: 'statistics', parent: 'app' })
        .state('settings', { url: 'settins', component: 'settings', parent: 'app' })
        .state('users', { url: 'users', component: 'users', parent: 'app' })
        .state('languageInspections', { url: 'inspections', component: 'languageInspections', parent: 'app' })
        .state('languageInspectionReports', {
            url: 'inspections/reports',
            component: 'maturityReporting',
            parent: 'app',
        });

    $urlRouterProvider.otherwise('/');
}
