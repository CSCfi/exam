(function () {
    'use strict';
    angular.module('sitnet.services')
        .service('httpInterceptor', [
            function () {

            }
        ]).config(['$httpProvider', function ($httpProvider) {
            $httpProvider.interceptors.push(['$q', '$rootScope' ,'$location', '$translate', 'wrongRoomService', 'waitingRoomService',
                function ($q, $rootScope, $location, $translate, wrongRoomService, waitingRoomService) {
                    return {
                        'response': function (response) {
                            var wrongPlace = response.headers()['x-sitnet-wrong-machine'];
                            if (wrongPlace) {
                                var location = atob(wrongPlace).split(":::");
                                wrongRoomService.display(location);
                            }

                            var hash = response.headers()['x-sitnet-start-exam'];
                            if (hash) {
                                var enrolmentId = response.headers()['x-sitnet-upcoming-exam'];
                                if (enrolmentId) {
                                    waitingRoomService.setEnrolmentId(enrolmentId);
                                    waitingRoomService.setExamHash(hash);
                                    $location.path('/student/waitingroom');
                                    $rootScope.$broadcast('upcomingExam');
                                } else {
                                    $location.path('/student/doexam/' + hash);
                                }
                            }

                            return response;
                        },
                        'responseError': function (response) {
                            if (typeof response.data === "string" || response.data instanceof String) {
                                var parts = response.data.split(" ");
                                for (var i = 0; i < parts.length; i++) {
                                    if (parts[i].substring(0, 7) === "sitnet_") {
                                        parts[i] = $translate(parts[i]);
                                    }
                                }
                                response.data = parts.join(" ");
                            }
                            return $q.reject(response);
                        }
                    }
                }
            ]);
        }]);
}());