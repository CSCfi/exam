(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ReportController', ['$scope', '$translate', '$location', '$http', 'SITNET_CONF', 'ReportResource', 'RoomResource', 'dateService',
            function ($scope, $translate, $location, $http, SITNET_CONF, ReportResource, RoomResource, dateService) {

                $scope.dateService = dateService;

                $scope.examRoomReservations = SITNET_CONF.TEMPLATES_PATH + "reports/exam-room-reservations.html";
                $scope.examReport = SITNET_CONF.TEMPLATES_PATH + "reports/exam-report.html";
                $scope.examReportJson = SITNET_CONF.TEMPLATES_PATH + "reports/exam-report-json.html";
                $scope.examAnswers = SITNET_CONF.TEMPLATES_PATH + "reports/exam-answers.html";

                $scope.selectedRoom = {
                    name: $translate("sitnet_choose")
                };
                $scope.selectedExam;
                $scope.selectedRoom;
                $scope.link;

                $scope.rooms = RoomResource.rooms.query();
                $scope.examnames = ReportResource.examnames.query();


                $scope.setExam = function (exam) {
                    $scope.link = 'statistics/examnames/'+ exam;
                };
                $scope.setRoom = function (room) {
                    $scope.selectedRoom = room;
                };

                $scope.getReservations = function() {

                    ReportResource.resbydate.get({roomId: $scope.selectedRoom.id, from: '01.01.2014', to: '29.08.2014'},
                    function (data) {

                    }, function (error) {
                        toastr.error(error.data);
                    });

//                    $location.path("#/statistics/resbydate/1/01.01.2014/29.08.2014");

                };

            }]);
}());