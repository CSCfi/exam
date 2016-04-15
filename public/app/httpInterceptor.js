(function () {
    'use strict';
    angular.module('exam.services')
        .service('httpInterceptor', [
            function () {

            }
        ]).config(['$httpProvider', function ($httpProvider) {
            $httpProvider.interceptors.push(['$q', '$cookies', 'sessionService', '$rootScope', '$location', '$translate', 'wrongRoomService', 'waitingRoomService',
                function ($q, $cookies, sessionService, $rootScope, $location, $translate, wrongRoomService, waitingRoomService) {


                    return {
                        'request': function (request) {
                            if (request.method !== 'GET') {
                                var csrfToken = $cookies.get('csrfToken');
                                request.url += "?csrfToken=" + csrfToken;
                            }
                            return request;
                        },
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
                                var location = b64_to_utf8(unknownMachine).split(":::");
                                wrongRoomService.display(location);
                            }
                            else if (wrongRoom) {
                                parts = b64_to_utf8(wrongRoom).split(":::");
                                waitingRoomService.setEnrolmentId(parts[0]);
                                waitingRoomService.setActualRoom(parts[1] + " (" + parts[2] + ")");
                                waitingRoomService.setActualMachine(parts[3]);
                                $location.path('/student/wrongmachine');
                                $rootScope.$broadcast('wrongMachine');
                            }
                            else if (wrongMachine) {
                                parts = b64_to_utf8(wrongMachine).split(":::");
                                waitingRoomService.setEnrolmentId(parts[0]);
                                waitingRoomService.setActualMachine(parts[1]);
                                $location.path('/student/wrongmachine');
                                $rootScope.$broadcast('wrongMachine');
                            }
                            else if (hash) {
                                if (enrolmentId) {
                                    waitingRoomService.setEnrolmentId(enrolmentId);
                                    $location.path('/student/waitingroom');
                                    $rootScope.$broadcast('upcomingExam');
                                } else {
                                    $location.path('/student/exam/' + hash);
                                    $rootScope.$broadcast('examStarted');
                                }
                            } else if (enrolmentId) {
                                // no exams for today
                                waitingRoomService.setEnrolmentId(null);
                                $location.path('/student/waitingroom');
                                $rootScope.$broadcast('upcomingExam');
                            }

                            return response;
                        },
                        'responseError': function (response) {
                            if (response.status === -1) {
                                // connection failure
                                toastr.error($translate.instant('sitnet_connection_refused'));
                            }
                            else if (typeof response.data === "string" || response.data instanceof String) {
                                var deferred = $q.defer();
                                if (response.data.match(/^".*"$/g)) {
                                    response.data = response.data.slice(1, response.data.length - 1);
                                }
                                var parts = response.data.split(" ");
                                $translate(parts).then(function (t) {
                                    for (var i = 0; i < parts.length; i++) {
                                        if (parts[i].substring(0, 7) === "sitnet_") {
                                            parts[i] = t[parts[i]];
                                        }
                                    }
                                    response.data = parts.join(" ");
                                    return deferred.reject(response);
                                });
                                return deferred.promise;
                            }
                            return $q.reject(response);
                        }
                    };
                }
            ]);
        }]);
}());
