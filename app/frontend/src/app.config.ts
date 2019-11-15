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
import * as base64 from 'base64-js';
import * as toast from 'toastr';

// eslint-disable-next-line
const textEncoding = require('text-encoding-polyfill');
export default function configs(
    $translateProvider: angular.translate.ITranslateProvider,
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
        l => $translateProvider.translations(l, require(`./assets/i18n/${l}.json`)),
    );

    $translateProvider.useSanitizeValueStrategy('');
    $translateProvider.preferredLanguage('en');

    $locationProvider.html5Mode({ enabled: true, requireBase: false });
    $locationProvider.hashPrefix('');

    // HTTP INTERCEPTOR
    $httpProvider.interceptors.push(function($q, $rootScope, $state, $translate, $window, Session, WrongLocation) {
        'ngInject';
        return {
            request: function(request) {
                Object.assign(request.headers, { 'x-exam-authentication': Session.getToken() });
                return request;
            },
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
                    parts = b64ToUtf8(wrongRoom).split(':::');
                    $state.go('wrongRoom', { eid: parts[0], mid: parts[1] });
                    $rootScope.$broadcast('wrongLocation');
                } else if (wrongMachine) {
                    parts = b64ToUtf8(wrongMachine).split(':::');
                    $state.go('wrongMachine', { eid: parts[0], mid: parts[1] });
                    $rootScope.$broadcast('wrongLocation');
                } else if (wrongUserAgent) {
                    WrongLocation.displayWrongUserAgent(wrongUserAgent); // Show warning notice on screen
                } else if (enrolmentId) {
                    // Go to waiting room
                    const id = enrolmentId === 'none' ? '' : enrolmentId;
                    if (enrolmentId === 'none') {
                        // No upcoming exams
                        $state.go('waitingRoomNoExam');
                    } else {
                        $state.go('waitingRoom', { id: id });
                    }
                    $rootScope.$broadcast('upcomingExam');
                } else if (hash) {
                    // Start/continue exam
                    $state.go('examination', { hash: hash });
                    $rootScope.$broadcast('examStarted');
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
