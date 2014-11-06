(function () {
    'use strict';
    angular.module('sitnet.services')
        .service('httpInterceptor', [
            function () {

            }
        ]).config(['$httpProvider', function ($httpProvider) {
            $httpProvider.interceptors.push(['$q', '$rootScope' ,'$location', '$translate', 'wrongRoomService',
                function ($q, $rootScope, $location, $translate, wrongRoomService) {
                    return {
                        'response': function (response) {
                            var wrongPlace = response.headers()['x-sitnet-wrong-machine'];
                            if (wrongPlace) {
                                var location = atob(wrongPlace).split(":::");
                                wrongRoomService.display(location);
                            }

                            var startExam = response.headers()['x-sitnet-start-exam'];
                            if (startExam) {
                                $location.path('/student/doexam/' + startExam);
                            }

                            return response;
                        },
                        'responseError': function (response) {
                            if (response.data) {
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