(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ReportController', ['$scope', '$translate', '$location', '$http', 'SITNET_CONF', 'ReportResource', 'RoomResource', 'dateService', '$filter', 'UserRes',
            function ($scope, $translate, $location, $http, SITNET_CONF, ReportResource, RoomResource, dateService, $filter, UserRes) {

                $scope.dateService = dateService;

                $scope.examRoomReservations = SITNET_CONF.TEMPLATES_PATH + "reports/exam-room-reservations.html";
                $scope.teacherExamsReport = SITNET_CONF.TEMPLATES_PATH + "reports/teacher-exams.html";
                $scope.reviewedExams = SITNET_CONF.TEMPLATES_PATH + "reports/reviewed-exams.html";
                $scope.examReport = SITNET_CONF.TEMPLATES_PATH + "reports/exam-report.html";
                $scope.examReportJson = SITNET_CONF.TEMPLATES_PATH + "reports/exam-report-json.html";
                $scope.examAnswers = SITNET_CONF.TEMPLATES_PATH + "reports/exam-answers.html";

                $scope.selectedRoom = {
                    name: $translate("sitnet_choose")
                };
                $scope.selectedExam;
                $scope.selectedRoom;
                $scope.selectedTeacher = {
                    name: $translate("sitnet_choose")
                };
                $scope.link;

                $scope.rooms = RoomResource.rooms.query();
                $scope.examnames = ReportResource.examnames.query();
                $scope.teachers = UserRes.usersByRole.query({role: "TEACHER"});

                $scope.setExam = function (exam) {
                    $scope.link = 'statistics/examnames/'+ exam;
                };
                $scope.setRoom = function (room) {
                    $scope.selectedRoom = room;
                };
                $scope.setTeacher = function (teacher) {
                    $scope.selectedTeacher = teacher;
                };


                $scope.getReservations = function() {

                    ReportResource.resbydate.get({roomId: $scope.selectedRoom.id, from: '01.01.2014', to: '29.08.2014'},
                    function (data) {

                    }, function (error) {
                        toastr.error(error.data);
                    });

//                    $location.path("#/statistics/resbydate/1/01.01.2014/29.08.2014");

                };


                $scope.getReviewsByDate = function(from, to) {

                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");

                    $http({method: 'GET', url: '/statistics/reviewsbydate/' + f + '/' + t}).
                        success(function(data, status, headers, config) {

                            var element = angular.element('<a/>');
                            element.attr({
                                href: 'data:attachment;charset=utf-8; base64,' + encodeURI(data),
                                target: '_blank',
                                download: 'suoritukset_' + f + '_' + t + '.xlsx'
                            })[0].click();

                        }).
                        error(function(data, status, headers, config) {
                            // if there's an error you should see it here
                        });
                };

                $scope.getTeacherExamsByDate = function(uid, from, to) {

                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");

                    if (uid > 0) {

                        $http({method: 'GET', url: '/statistics/teacherexamsbydate/' + uid + '/' + f + '/' + t}).
                            success(function (data, status, headers, config) {

                                var element = angular.element('<a/>');
                                element.attr({
                                    href: 'data:attachment;charset=utf-8; base64,' + encodeURI(data),
                                    target: '_blank',
                                    download: 'luodut_tentit_' + f + '_' + t + '.xlsx'
                                })[0].click();

                            }).
                            error(function (data, status, headers, config) {
                                // if there's an error you should see it here
                            });
                    } else {
                        toastr.error("Valitse opettaja");
                    }
                };

            }]);
}());