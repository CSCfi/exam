(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ReportController', ['$translate', 'EXAM_CONF', 'ReportResource', 'RoomResource', 'dateService', '$filter', 'UserRes', 'fileService',
            function ($translate, EXAM_CONF, ReportResource, RoomResource, dateService, $filter, UserRes, fileService) {

                var ctrl = this;

                ctrl.dateService = dateService;
                ctrl.csvExport = {};
                ctrl.templates = {
                    examRoomReservations: EXAM_CONF.TEMPLATES_PATH + "administrative/reports/exam-room-reservations.html",
                    teacherExamsReport: EXAM_CONF.TEMPLATES_PATH + "administrative/reports/teacher-exams.html",
                    reviewedExams: EXAM_CONF.TEMPLATES_PATH + "administrative/reports/reviewed-exams.html",
                    examReport: EXAM_CONF.TEMPLATES_PATH + "administrative/reports/exam-report.html",
                    examReportJson: EXAM_CONF.TEMPLATES_PATH + "administrative/reports/exam-report-json.html",
                    examAnswers: EXAM_CONF.TEMPLATES_PATH + "administrative/reports/exam-answers.html",
                    examEnrollmentsReport: EXAM_CONF.TEMPLATES_PATH + "administrative/reports/exam-enrollments.html",
                    studentReport: EXAM_CONF.TEMPLATES_PATH + "administrative/reports/student.html",
                    examRecordsCsv: EXAM_CONF.TEMPLATES_PATH + "administrative/reports/exam-records-csv.html"
                };

                ctrl.selectedFields = {
                    room: {name: $translate.instant("sitnet_choose")}
                };

                ctrl.setRoom = function (room) {
                    ctrl.selectedFields.room = room;
                };

                ctrl.rooms = RoomResource.rooms.query();
                ctrl.examnames = ReportResource.examnames.query();

                ctrl.teachers = UserRes.usersByRole.query({role: "TEACHER"});
                ctrl.students = UserRes.usersByRole.query({role: "STUDENT"});

                ctrl.getExamEnrollments = function (exam) {
                    if (exam) {
                        fileService.download('/app/statistics/examenrollments/' + exam.id, 'exam_enrolments.xlsx');
                    } else {
                        toastr.error($translate.instant('sitnet_choose_exam'));
                    }
                };

                ctrl.getStudentReport = function (student, from, to) {
                    if (student) {
                        var f = $filter("date")(from, "dd.MM.yyyy") ;
                        var t = $filter("date")(to, "dd.MM.yyyy");
                        fileService.download('/app/statistics/student/' + student.id + '/' + f + '/' + t, 'student_activity.xlsx');
                    } else {
                        toastr.error($translate.instant('sitnet_choose_student'));
                    }
                };

                ctrl.getExamAnswerReport = function (from, to) {
                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");
                    fileService.download('/app/statistics/allexams/' + f + '/' + t, 'exam_answers_' + f + '_' + t + '.xlsx');
                };

                ctrl.getExamsXlsx = function (exam) {
                    if (exam) {
                        fileService.download('/app/statistics/examnames/' + exam.id + '/xlsx', 'exams.xlsx');
                    } else {
                        toastr.error($translate.instant('sitnet_choose_exam'));
                    }
                };

                ctrl.getExamsJson = function (exam) {
                    if (exam) {
                        fileService.download('/app/statistics/examnames/' + exam.id + '/json', 'exams.json');
                    } else {
                        toastr.error($translate.instant('sitnet_choose_exam'));
                    }
                };

                ctrl.getReviewsByDate = function (from, to) {
                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");
                    fileService.download('/app/statistics/reviewsbydate/' + f + '/' + t, 'reviews_' + f + '_' + t + '.xlsx');
                };

                ctrl.getTeacherExamsByDate = function (teacher, from, to) {
                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");
                    if (teacher) {
                        fileService.download('/app/statistics/teacherexamsbydate/' + teacher.id + '/' + f + '/' + t,
                            'teacherexams_' + f + '_' + t + '.xlsx');
                    } else {
                        toastr.error($translate.instant('sitnet_choose_teacher'));
                    }
                };

                ctrl.getRoomReservationsByDate = function (rid, from, to) {
                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");
                    if (rid > 0) {
                        fileService.download('/app/statistics/resbydate/' + rid + '/' + f + '/' + t, 'reservations_' + f + '_' + t + '.xlsx');
                    } else {
                        toastr.error($translate.instant('sitnet_choose_room'));
                    }
                };

                ctrl.getExamRecords = function () {
                    var start = new Date(ctrl.csvExport.startDate).getTime();
                    var end = new Date(ctrl.csvExport.endDate).setHours(23, 59, 59, 999);
                    if (!start) {
                        start = 0;
                    }
                    if (!end) {
                        end = new Date().setHours(23, 59, 59, 999);
                    }
                    fileService.download('/app/exam/record', 'examrecords.csv', {'startDate': start, 'endDate': end});
                };

            }]);
}());
