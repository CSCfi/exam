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

'use strict';

angular.module('app').config(['$translateProvider', '$routeProvider', '$httpProvider', '$locationProvider',
    '$compileProvider', 'tmhDynamicLocaleProvider', 'EXAM_CONF',
    function ($translateProvider, $routeProvider, $httpProvider, $locationProvider, $compileProvider,
              tmhDynamicLocaleProvider, EXAM_CONF) {
        $compileProvider.debugInfoEnabled(false);
        $httpProvider.useApplyAsync(true);

        // IE caches each and every GET unless the following is applied:
        if (!$httpProvider.defaults.headers.get) {
            $httpProvider.defaults.headers.get = {};
        }
        $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
        $httpProvider.defaults.headers.get.Pragma = 'no-cache';

        var path = EXAM_CONF.LANGUAGES_PATH;
        $translateProvider.useStaticFilesLoader({
            prefix: path + 'locale-',
            suffix: '.json'
        });
        $translateProvider.useSanitizeValueStrategy(null);
        $translateProvider.preferredLanguage('en');

        tmhDynamicLocaleProvider.localeLocationPattern(
            '/webjars/angular-i18n/' + EXAM_CONF.NG_VERSION + '/angular-locale_{{locale}}.js');

        $locationProvider.html5Mode({enabled: true, requireBase: false});

        // ROUTING -->

        /* index */
        $routeProvider.when('/', {template: '<dashboard></dashboard>', reloadOnSearch: false});

        // questions
        $routeProvider.when('/questions', {template: '<library></library>'});
        $routeProvider.when('/questions/:id', {template: '<question new-question="false"></question>'});
        $routeProvider.when('/questions/newQuestion/:create', {template: '<question new-question="true"></question>'});

        /* exams */
        $routeProvider.when('/exams/new', {template: '<new-exam></new-exam>'});

        $routeProvider.when('/exams/:id/:tab', {template: '<exam-tabs></exam-tabs>'});
        $routeProvider.when('/exams/:id/select/course', {template: '<course-selection></course-selection>'});
        $routeProvider.when('/exams/:id/view/preview/:tab?', {template: '<examination is-preview="true"><examination>'});
        $routeProvider.when('/exams/:id/view/printout/:tab?', {template: '<printout></printout>'});
        $routeProvider.when('/printouts', {template: '<printout-listing></printout-listing>'});

        /* calendar */
        $routeProvider.when('/calendar/:id', {template: '<calendar is-external="false"></calendar>'});
        $routeProvider.when('/iop/calendar/:id', {template: '<calendar is-external="true"></calendar>'});

        /* logout */
        $routeProvider.when('/logout', {template: '<logout></logout>'});

        /* Student */
        $routeProvider.when('/student/exam/:hash', {template: '<examination is-preview="false"><examination>'});
        $routeProvider.when('/student/waiting-room/:id?', {template: '<waiting-room></waiting-room>'});
        $routeProvider.when('/student/wrong-room/:eid/:mid', {template: '<wrong-location cause="room"></wrong-location>'});
        $routeProvider.when('/student/wrong-machine/:eid/:mid', {template: '<wrong-location cause="machine"></wrong-location>'});

        $routeProvider.when('/student/exams', {template: '<exam-search></exam-search>'});
        $routeProvider.when('/student/participations', {template: '<exam-participations></exam-participations>'});
        $routeProvider.when('/student/logout/:reason?', {template: '<examination-logout></examination-logout>'});
        $routeProvider.when('/enroll/:code/exam/:id', {template: '<exam-enrolments></exam-enrolments>'});


        /* review */
        $routeProvider.when('/assessments/:id', {template: '<assessment></assessment>'});
        $routeProvider.when('/speedreview/:id', {template: '<speed-review></speed-review>'});
        $routeProvider.when('/print/exam/:id', {template: '<printed-assessment></printed-assessment>'});

        $routeProvider.when('/assessments/:id/questions', {template: '<question-assessment></question-assessment>'});


        /* reservations */
        $routeProvider.when('/reservations', {template: '<reservations user-role="teacher"></reservations>'});
        $routeProvider.when('/reservations/:eid', {template: '<reservations user-role="teacher"></reservations>'});

        /* Admin */
        $routeProvider.when('/exams', {template: '<exam-list></exam-list>'});
        $routeProvider.when('/rooms', {template: '<room-list></room-list>'});
        $routeProvider.when('/rooms/:id', {template: '<room></room>'});
        $routeProvider.when('/rooms_edit/edit_multiple', {template: '<multi-room></multi-room>'});

        $routeProvider.when('/softwares', {template: '<software></software>'});
        $routeProvider.when('/accessibility', {template: '<accessibility></accessibility>'});
        $routeProvider.when('/machines/:id', {template: '<machine></machine>'});

        $routeProvider.when('/reports', {template: '<reports></reports>'});
        $routeProvider.when('/statistics', {template: '<statistics></statistics>'});
        $routeProvider.when('/settings', {template: '<settings></settings>'});
        $routeProvider.when('/users', {template: '<users></users>'});

        /* Language inspectors */
        $routeProvider.when('/inspections', {template: '<language-inspections></language-inspections>'});
        $routeProvider.when('/inspections/reports', {template: '<maturity-reporting></maturity-reporting>'});

        $routeProvider.otherwise({redirectTo: '/'});


        // HTTP INTERCEPTOR
        $httpProvider.interceptors.push(['$q', '$rootScope', '$location', '$translate', 'WrongLocation', 'toast',
            function ($q, $rootScope, $location, $translate, WrongLocation, toast) {
                return {
                    'response': function (response) {

                        var b64_to_utf8 = function (data) {
                            return decodeURIComponent(escape(atob(data)));
                        };

                        var unknownMachine = response.headers()['x-exam-unknown-machine'];
                        var wrongRoom = response.headers()['x-exam-wrong-room'];
                        var wrongMachine = response.headers()['x-exam-wrong-machine'];
                        var hash = response.headers()['x-exam-start-exam'];

                        var enrolmentId = response.headers()['x-exam-upcoming-exam'];
                        var parts;
                        if (unknownMachine) {
                            var location = b64_to_utf8(unknownMachine).split(':::');
                            WrongLocation.display(location); // Show warning notice on screen
                        }
                        else if (wrongRoom) {
                            parts = b64_to_utf8(wrongRoom).split(':::');
                            $location.path('/student/wrong-room/' + parts[0] + '/' + parts[1]);
                            $rootScope.$broadcast('wrongLocation');
                        }
                        else if (wrongMachine) {
                            parts = b64_to_utf8(wrongMachine).split(':::');
                            $location.path('/student/wrong-machine/' + parts[0] + '/' + parts[1]);
                            $rootScope.$broadcast('wrongLocation');
                        }
                        else if (enrolmentId) { // Go to waiting room
                            var id = enrolmentId === 'none' ? '' : enrolmentId;
                            $location.path(enrolmentId === 'none' ?
                                '/student/waiting-room' : '/student/waiting-room/' + id);
                            $rootScope.$broadcast('upcomingExam');
                        }
                        else if (hash) { // Start/continue exam
                            $location.path('/student/exam/' + hash);
                            $rootScope.$broadcast('examStarted');
                        }
                        return response;
                    },
                    'responseError': function (response) {
                        if (response.status === -1) {
                            // connection failure
                            toast.error($translate.instant('sitnet_connection_refused'));
                        }
                        else if (typeof response.data === 'string' || response.data instanceof String) {
                            var deferred = $q.defer();
                            if (response.data.match(/^".*"$/g)) {
                                response.data = response.data.slice(1, response.data.length - 1);
                            }
                            var parts = response.data.split(' ');
                            $translate(parts).then(function (t) {
                                for (var i = 0; i < parts.length; i++) {
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
                    }
                };
            }
        ]);

    }
]);
