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
import { StateProvider, UrlRouterProvider } from 'angular-ui-router';
import * as base64 from 'base64-js';
import * as textEncoding from 'text-encoding-polyfill';
import * as toast from 'toastr';

export default function configs(
    $translateProvider: angular.translate.ITranslateProvider,
    $urlRouterProvider: UrlRouterProvider,
    $stateProvider: StateProvider,
    $httpProvider: angular.IHttpProvider,
    $locationProvider: angular.ILocationProvider,
    $compileProvider: angular.ICompileProvider,
) {
    'ngInject';
    $compileProvider.debugInfoEnabled(false);
    $httpProvider.useApplyAsync(true);

    // IE caches each and every GET unless the following is applied:
    const defaults: angular.IHttpProviderDefaults = $httpProvider.defaults;
    const ieHeaders = { 'Cache-Control': 'no-cache', Pragma: 'no-cache' };
    Object.assign(defaults.headers, { get: ieHeaders });

    ['en', 'fi', 'sv'].forEach(
        // eslint-disable-next-line
        l => $translateProvider.translations(l, require(`./assets/languages/locale-${l}.json`)),
    );

    $translateProvider.useSanitizeValueStrategy('');
    $translateProvider.preferredLanguage('en');

    $locationProvider.html5Mode({ enabled: true, requireBase: false });
    $locationProvider.hashPrefix('');

    // ROUTING -->

    $stateProvider
        .state('dashboard', { url: '/', component: 'dashboard', reloadOnSearch: false })
        .state('library', { url: '/questions', component: 'library' })
        .state('question', {
            url: '/questions/{id}',
            component: 'question',
            resolve: {
                newQuestion: () => false,
                nextState: () => 'library',
            },
        })
        .state('newQuestion', {
            url: '/questions/newQuestion?next',
            component: 'question',
            resolve: {
                newQuestion: () => true,
            },
        })
        .state('newExam', { url: '/exams/new', component: 'newExam' })
        .state('examEditor', { url: '/exams/{id}/{tab}', component: 'examTabs' })
        .state('courseSelector', { url: '/exams/{id}/select/course', component: 'courseSelection' })
        .state('examPreview', {
            url: '/exams/{id}/view/preview?tab',
            component: 'examination',
            resolve: { isPreview: () => true },
        })
        .state('collaborativePreview', {
            url: '/exams/collaborative/{id}/view/preview?tab',
            component: 'examination',
            resolve: {
                isPreview: () => true,
                isCollaborative: () => true,
            },
        })
        .state('printout', { url: '/exams/{id}/view/printout?tab', component: 'printout' })
        .state('printouts', { url: '/printouts', component: 'printoutListing' })
        .state('collaborativeExams', { url: '/exams/collaborative', component: 'collaborativeExamListing' })
        .state('collaborativeExamEditor', {
            url: '/exams/collaborative/{id}/{tab}',
            component: 'examTabs',
            resolve: {
                collaborative: () => true,
            },
        })
        .state('calendar', {
            url: '/calendar/{id}?selected',
            component: 'calendar',
            resolve: {
                isExternal: () => false,
                isCollaborative: () => false,
            },
        })
        .state('externalCalendar', {
            url: '/iop/calendar/{id}?selected',
            component: 'calendar',
            resolve: {
                isExternal: () => true,
                isCollaborative: () => false,
            },
        })
        .state('collaborativeCalendar', {
            url: '/calendar/collaborative/{id}',
            component: 'calendar',
            resolve: {
                isExternal: () => false,
                isCollaborative: () => true,
            },
        })
        .state('logout', { url: '/logout', component: 'logout' })
        .state('examination', {
            url: '/student/exam/{hash}',
            component: 'examination',
            resolve: {
                isPreview: () => false,
            },
        })
        .state('waitingRoom', { url: '/student/waiting-room/{id}', component: 'waitingRoom' })
        .state('waitingRoomNoExam', { url: '/student/waiting-room', component: 'waitingRoom' })
        .state('wrongRoom', {
            url: '/student/wrong-room/{eid}/{mid}',
            component: 'wrongLocation',
            resolve: {
                cause: () => 'room',
            },
        })
        .state('wrongMachine', {
            url: '/student/wrong-machine/{eid}/{mid}',
            component: 'wrongLocation',
            resolve: {
                cause: () => 'machine',
            },
        })
        .state('examSearch', { url: '/student/exams', component: 'examSearch' })
        .state('collaborativeExamSearch', {
            url: '/student/exams/collaborative',
            component: 'collaborativeExamSearch',
        })
        .state('participations', { url: '/student/participations', component: 'examParticipations' })
        .state('collaborativeParticipations', {
            url: '/student/participations/collaborative',
            component: 'collaborativeExamParticipations',
        })
        .state('examinationLogout', { url: '/student/logout?reason&quitLinkEnabled', component: 'examinationLogout' })
        .state('enrolments', { url: '/enroll/exam/{id}?{code}', component: 'examEnrolments' })
        .state('assessment', {
            url: '/assessments/{id}',
            component: 'assessment',
            resolve: {
                collaborative: () => false,
            },
        })
        .state('collaborativeAssessment', {
            url: '/assessments/collaborative/{id}/{ref}',
            component: 'assessment',
            resolve: {
                collaborative: () => true,
            },
        })
        .state('speedReview', { url: '/speedreview/{id}', component: 'speedReview' })
        .state('printedAssessment', {
            url: '/print/exam/{id}',
            component: 'printedAssessment',
            resolve: {
                collaborative: () => false,
            },
        })
        .state('collaborativePrintedAssessment', {
            url: '/print/exam/{id}/{ref}',
            component: 'printedAssessment',
            resolve: {
                collaborative: () => true,
            },
        })
        .state('questionAssessment', { url: '/assessments/{id}/questions?q', component: 'questionAssessment' })
        .state('reservations', { url: '/reservations', component: 'teacherReservations' })
        .state('examReservations', { url: '/reservations/{eid}', component: 'teacherReservations' })
        .state('exams', { url: '/exams', component: 'examList' })
        .state('rooms', { url: '/rooms', component: 'examRoomsAdminTabs' })
        .state('room', { url: '/rooms/{id}', component: 'room' })
        .state('availability', { url: '/rooms/{id}/availability', component: 'availability' })
        .state('multiRoom', { url: '/rooms_edit/edit_multiple', component: 'multiRoom' })
        .state('software', { url: '/softwares', component: 'software' })
        .state('accessibility', { url: '/accessibility', component: 'accessibility' })
        .state('machine', { url: '/machines/{id}', component: 'machine' })
        .state('reports', { url: '/reports', component: 'reports' })
        .state('statistics', { url: '/statistics', component: 'statistics' })
        .state('settings', { url: '/settins', component: 'settings' })
        .state('users', { url: '/users', component: 'users' })
        .state('languageInspections', { url: '/inspections', component: 'languageInspections' })
        .state('languageInspectionReports', { url: '/inspections/reports', component: 'maturityReporting' });

    $urlRouterProvider.otherwise('/');

    // HTTP INTERCEPTOR
    $httpProvider.interceptors.push(function($q, $rootScope, $state, $translate, $window, WrongLocation) {
        'ngInject';
        return {
            response: function(response) {
                if (!$window['TextDecoder']) {
                    $window['TextDecoder'] = textEncoding.TextDecoder;
                }

                const b64ToUtf8 = (str: string, encoding = 'utf-8'): string => {
                    const bytes = base64.toByteArray(str);
                    return new TextDecoder(encoding).decode(bytes);
                };

                const unknownMachine = response.headers()['x-exam-unknown-machine'];
                const wrongRoom = response.headers()['x-exam-wrong-room'];
                const wrongMachine = response.headers()['x-exam-wrong-machine'];
                const wrongUserAgent = response.headers()['x-exam-wrong-agent-config'];
                const hash = response.headers()['x-exam-start-exam'];

                const enrolmentId = response.headers()['x-exam-upcoming-exam'];
                let parts: string[];
                if (unknownMachine) {
                    const location = b64ToUtf8(unknownMachine).split(':::');
                    WrongLocation.display(location); // Show warning notice on screen
                } else if (wrongRoom) {
                    $rootScope.$broadcast('wrongLocation');
                    parts = b64ToUtf8(wrongRoom).split(':::');
                    $state.go('wrongRoom', { eid: parts[0], mid: parts[1] });
                } else if (wrongMachine) {
                    $rootScope.$broadcast('wrongLocation');
                    parts = b64ToUtf8(wrongMachine).split(':::');
                    $state.go('wrongMachine', { eid: parts[0], mid: parts[1] });
                } else if (wrongUserAgent) {
                    WrongLocation.displayWrongUserAgent(wrongUserAgent); // Show warning notice on screen
                } else if (enrolmentId) {
                    // Go to waiting room
                    $rootScope.$broadcast('upcomingExam');
                    const id = enrolmentId === 'none' ? '' : enrolmentId;
                    if (enrolmentId === 'none') {
                        // No upcoming exams
                        $state.go('waitingRoomNoExam');
                    } else {
                        $state.go('waitingRoom', { id: id });
                    }
                } else if (hash) {
                    // Start/continue exam
                    $rootScope.$broadcast('examStarted');
                    $state.go('examination', { hash: hash });
                }
                return response;
            },
            responseError: function(response) {
                if (response.status === -1) {
                    // connection failure
                    toast.error($translate.instant('sitnet_connection_refused'));
                } else if (typeof response.data === 'string' || response.data instanceof String) {
                    const deferred = $q.defer();
                    if (response.data.match(/^".*"$/g)) {
                        response.data = response.data.slice(1, response.data.length - 1);
                    }
                    const parts = response.data.split(' ');
                    $translate(parts).then((t: string[]) => {
                        for (let i = 0; i < parts.length; i++) {
                            if (parts[i].substring(0, 7) === 'sitnet_') {
                                parts[i] = t[parts[i]];
                            }
                        }
                        response.data = parts.join(' ');
                        return deferred.reject(response);
                    });
                    return deferred.promise;
                }
                return $q.reject(response);
            },
        };
    });
}
