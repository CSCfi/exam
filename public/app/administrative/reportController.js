(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ReportController', ['$scope', '$translate', 'EXAM_CONF', 'ReportResource', 'RoomResource', 'dateService', '$filter', 'UserRes', 'fileService',
            function ($scope, $translate, EXAM_CONF, ReportResource, RoomResource, dateService, $filter, UserRes, fileService) {

                $scope.dateService = dateService;
                $scope.csvExport = {};

                $scope.examRoomReservations = EXAM_CONF.TEMPLATES_PATH + "administrative/reports/exam-room-reservations.html";
                $scope.teacherExamsReport = EXAM_CONF.TEMPLATES_PATH + "administrative/reports/teacher-exams.html";
                $scope.reviewedExams = EXAM_CONF.TEMPLATES_PATH + "administrative/reports/reviewed-exams.html";
                $scope.examReport = EXAM_CONF.TEMPLATES_PATH + "administrative/reports/exam-report.html";
                $scope.examReportJson = EXAM_CONF.TEMPLATES_PATH + "administrative/reports/exam-report-json.html";
                $scope.examAnswers = EXAM_CONF.TEMPLATES_PATH + "administrative/reports/exam-answers.html";
                $scope.examEnrollmentsReport = EXAM_CONF.TEMPLATES_PATH + "administrative/reports/exam-enrollments.html";
                $scope.studentReport = EXAM_CONF.TEMPLATES_PATH + "administrative/reports/student.html";
                $scope.examRecordsCsv = EXAM_CONF.TEMPLATES_PATH + "administrative/reports/exam-records-csv.html";

                $scope.selectedRoom = {
                    name: $translate("sitnet_choose")
                };
                $scope.setExam = function (exam) {
                    $scope.selectedExam = exam;
                };

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
                };

                $scope.setStudent = function (student) {
                    $scope.selectedStudent = student;
                };

                $scope.rooms = RoomResource.rooms.query();
                $scope.examnames = ReportResource.examnames.query();

                $scope.teachers = UserRes.usersByRole.query({role: "TEACHER"});
                $scope.students = UserRes.usersByRole.query({role: "STUDENT"});

                $scope.getExamEnrollments = function (exam) {
                    if (exam) {
                        fileService.download('/statistics/examenrollments/' + exam, 'exam_enrolments.xlsx');
                    } else {
                        toastr.error($translate('sitnet_choose_exam'));
                    }
                };

                $scope.getStudentReport = function (student, from, to) {
                    if (student) {
                        var f = $filter("date")(from, "dd.MM.yyyy") ;
                        var t = $filter("date")(to, "dd.MM.yyyy");
                        fileService.download('/statistics/student/' + student + '/' + f + '/' + t, 'student_activity.xlsx');
                    } else {
                        toastr.error($translate('sitnet_choose_student'));
                    }
                };

                $scope.getExamAnswerReport = function (from, to) {
                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");
                    fileService.download('statistics/allexams/' + f + '/' + t, 'exam_answers_' + f + '_' + t + '.xlsx');
                };

                $scope.getExamsXlsx = function (exam) {
                    if (exam) {
                        fileService.download('/statistics/examnames/' + exam + '/xlsx', 'exams.xlsx');
                    } else {
                        toastr.error($translate('sitnet_choose_exam'));
                    }
                };

                $scope.getExamsJson = function (exam) {
                    if (exam) {
                        fileService.download('/statistics/examnames/' + exam + '/json', 'exams.json');
                    } else {
                        toastr.error($translate('sitnet_choose_exam'));
                    }
                };

                $scope.getReviewsByDate = function (from, to) {
                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");
                    fileService.download('statistics/reviewsbydate/' + f + '/' + t, 'reviews_' + f + '_' + t + '.xlsx');
                };

                $scope.getTeacherExamsByDate = function (uid, from, to) {
                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");
                    if (uid > 0) {
                        fileService.download('/statistics/teacherexamsbydate/' + uid + '/' + f + '/' + t,
                            'teacherexams_' + f + '_' + t + '.xlsx');
                    } else {
                        toastr.error($translate('sitnet_choose_teacher'));
                    }
                };

                $scope.getRoomReservationsByDate = function (rid, from, to) {
                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");
                    if (rid > 0) {
                        fileService.download('/statistics/resbydate/' + rid + '/' + f + '/' + t, 'reservations_' + f + '_' + t + '.xlsx');
                    } else {
                        toastr.error($translate('sitnet_choose_room'));
                    }
                };

                $scope.getExamRecords = function () {
                    var start = new Date($scope.csvExport.startDate).getTime();
                    var end = new Date($scope.csvExport.endDate).setHours(23, 59, 59, 999);
                    if (!start) {
                        start = 0;
                    }
                    if (!end) {
                        end = new Date().setHours(23, 59, 59, 999);
                    }
                    fileService.download('/exam/record', 'examrecords.csv', {'startDate': start, 'endDate': end});
                };

            }]);
}());