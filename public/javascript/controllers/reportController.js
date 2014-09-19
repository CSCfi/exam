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
                $scope.examEnrollmentsReport = SITNET_CONF.TEMPLATES_PATH + "reports/exam-enrollments.html";
                $scope.studentReport = SITNET_CONF.TEMPLATES_PATH + "reports/student.html";

                $scope.selectedRoom = {
                    name: $translate("sitnet_choose")
                };
                $scope.selectedExam;
                $scope.setExam = function (exam) {
                    $scope.selectedExam = exam;
                };

                $scope.examEnrollment;

                $scope.setRoom = function (room) {
                    $scope.selectedRoom = room;
                };

                $scope.selectedTeacher = {
                    name: $translate("sitnet_choose")
                };

                $scope.setTeacher = function (teacher) {
                    $scope.selectedTeacher = teacher;
                };

                $scope.selectedStudent = {
                    name: $translate("sitnet_choose")
                }

                $scope.setStudent = function (student) {
                    $scope.selectedStudent = student;
                };

                $scope.rooms = RoomResource.rooms.query();
                $scope.examnames = ReportResource.examnames.query();
                $scope.teachers = UserRes.usersByRole.query({role: "TEACHER"});
                $scope.students = UserRes.usersByRole.query({role: "STUDENT"});


                $scope.getReservations = function() {

                    ReportResource.resbydate.get({roomId: $scope.selectedRoom.id, from: '01.01.2014', to: '29.08.2014'},
                    function (data) {

                    }, function (error) {
                        toastr.error(error.data);
                    });

//                    $location.path("#/statistics/resbydate/1/01.01.2014/29.08.2014");

                };

                $scope.getExamEnrollments = function (exam) {

                    if(exam) {

                        $http({method: 'GET', url: '/statistics/examenrollments/' + exam}).
                            success(function (data, status, headers, config) {

                                var element = angular.element('<a/>');
                                element.attr({
                                    href: 'data:application/octet-stream;charset=utf-8; base64,' + encodeURI(data),
                                    target: '_blank',
                                    download: 'tentti_ilmoittautumiset.xlsx'
                                })[0].click();

                            }).
                            error(function (data, status, headers, config) {
                                // if there's an error you should see it here
                            });
                    } else {
                        toastr.error("Valitse tentti");
                    }
                };

                $scope.getStudentReport = function (student, from, to) {

                    if(student) {

                        var f = $filter("date")(from, "dd.MM.yyyy");
                        var t = $filter("date")(to, "dd.MM.yyyy");

                        $http({method: 'GET', url: '/statistics/student/' + student + '/' + f + '/' + t}).
                            success(function (data, status, headers, config) {

                                var element = angular.element('<a/>');
                                element.attr({
                                    href: 'data:application/octet-stream;charset=utf-8; base64,' + encodeURI(data),
                                    target: '_blank',
                                    download: 'opiskelijan_aktiviteetit.xlsx'
                                })[0].click();

                            }).
                            error(function (data, status, headers, config) {
                                // if there's an error you should see it here
                            });
                    } else {
                        toastr.error("Valitse opiskelija");
                    }
                };

                $scope.getExamAnswerReport = function (from, to) {

                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");

                    $http({method: 'GET', url: 'statistics/allexams/' + f + '/' + t}).
                        success(function (data, status, headers, config) {

                            var element = angular.element('<a/>');
                            element.attr({
                                href: 'data:application/octet-stream;charset=utf-8; base64,' + encodeURI(data),
                                target: '_blank',
                                download: 'tentti_vastaukset_' + f + '_' + t + '.xlsx'
                            })[0].click();

                        }).
                        error(function (data, status, headers, config) {
                            // if there's an error you should see it here
                        });

                };

                $scope.exam_json;
                $scope.exam_xlsx;

                $scope.getExamsXlsx = function (exam) {

                    if(exam) {

                        $http({method: 'GET', url: '/statistics/examnames/' + exam + '/xlsx'}).
                            success(function (data, status, headers, config) {

                                var element = angular.element('<a/>');
                                element.attr({
                                    href: 'data:application/octet-stream;charset=utf-8; base64,' + encodeURI(data),
                                    target: '_blank',
                                    download: 'tentit.xlsx'
                                })[0].click();

                            }).
                            error(function (data, status, headers, config) {
                                // if there's an error you should see it here
                            });
                    } else {
                        toastr.error("Valitse tentti");
                    }
                };

                $scope.getExamsJson = function (exam) {

                    if(exam) {

                        $http({method: 'GET', url: '/statistics/examnames/' + exam + '/json'}).
                            success(function (data, status, headers, config) {
                                console.log(data);
                                var element = angular.element('<a/>');
                                element.attr({
                                    href: 'data:application/octet-stream;charset=utf-8; base64,' + encodeURI(data),
                                    target: '_blank',
                                    download: 'tentit.json'
                                })[0].click();

                            }).
                            error(function (data, status, headers, config) {
                                // if there's an error you should see it here
                            });
                    } else {
                        toastr.error("Valitse tentti");
                    }
                };


                $scope.getReviewsByDate = function(from, to) {

                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");

                    $http({method: 'GET', url: '/statistics/reviewsbydate/' + f + '/' + t}).
                        success(function(data, status, headers, config) {

                            var element = angular.element('<a/>');
                            element.attr({
                                href: 'data:application/octet-stream;charset=utf-8; base64,' + encodeURI(data),
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
                                    href: 'data:application/octet-stream;charset=utf-8; base64,' + encodeURI(data),
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

                $scope.getRoomReservationsByDate = function(rid, from, to) {

                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");

                    if (rid > 0) {

                        $http({method: 'GET', url: '/statistics/resbydate/' + rid + '/' + f + '/' + t}).
                            success(function (data, status, headers, config) {

                                var element = angular.element('<a/>');
                                element.attr({
                                    href: 'data:application/octet-stream;charset=utf-8; base64,' + encodeURI(data),
                                    target: '_blank',
                                    download: 'tilavaraukset_' + f + '_' + t + '.xlsx'
                                })[0].click();

                            }).
                            error(function (data, status, headers, config) {
                                // if there's an error you should see it here
                            });
                    } else {
                        toastr.error("Valitse tila");
                    }
                };

            }]);
}());