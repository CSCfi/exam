(function () {
    'use strict';
    angular.module('sitnet.services')
        .service('httpInterceptor', [
            function () {

            }
        ]).config(['$httpProvider', function ($httpProvider) {
            $httpProvider.interceptors.push(['$rootScope' ,'$location', 'wrongRoomService', function ($rootScope, $location, wrongRoomService) {
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
                    }
                };
            }]);
        }]);
}());