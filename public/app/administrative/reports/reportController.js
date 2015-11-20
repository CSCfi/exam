(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ReportController', ['$scope', '$translate', 'EXAM_CONF', 'ReportResource', 'RoomResource', 'dateService', '$filter', 'UserRes', 'fileService',
            function ($scope, $translate, EXAM_CONF, ReportResource, RoomResource, dateService, $filter, UserRes, fileService) {

                $scope.dateService = dateService;
                $scope.csvExport = {};
                $scope.templates = {
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

                $scope.selectedFields = {
                    exam: {},
                    room: {name: $translate.instant("sitnet_choose")},
                    teacher: {name: $translate.instant("sitnet_choose")},
                    student: {name: $translate.instant("sitnet_choose")}
                };

                $scope.setExam = function (exam) {
                    $scope.selectedFields.exam = exam;
                };

                $scope.setRoom = function (room) {
                    $scope.selectedFields.room = room;
                };

                $scope.setTeacher = function (teacher) {
                    $scope.selectedFields.teacher = teacher;
                };

                $scope.setStudent = function (student) {
                    $scope.selectedFields.student = student;
                };

                $scope.rooms = RoomResource.rooms.query();
                $scope.examnames = ReportResource.examnames.query();

                $scope.teachers = UserRes.usersByRole.query({role: "TEACHER"});
                $scope.students = UserRes.usersByRole.query({role: "STUDENT"});

                $scope.getExamEnrollments = function (exam) {
                    if (exam) {
                        fileService.download('/statistics/examenrollments/' + exam, 'exam_enrolments.xlsx');
                    } else {
                        toastr.error($translate.instant('sitnet_choose_exam'));
                    }
                };

                $scope.getStudentReport = function (student, from, to) {
                    if (student) {
                        var f = $filter("date")(from, "dd.MM.yyyy") ;
                        var t = $filter("date")(to, "dd.MM.yyyy");
                        fileService.download('/statistics/student/' + student + '/' + f + '/' + t, 'student_activity.xlsx');
                    } else {
                        toastr.error($translate.instant('sitnet_choose_student'));
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
                        toastr.error($translate.instant('sitnet_choose_exam'));
                    }
                };

                $scope.getExamsJson = function (exam) {
                    if (exam) {
                        fileService.download('/statistics/examnames/' + exam + '/json', 'exams.json');
                    } else {
                        toastr.error($translate.instant('sitnet_choose_exam'));
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
                        toastr.error($translate.instant('sitnet_choose_teacher'));
                    }
                };

                $scope.getRoomReservationsByDate = function (rid, from, to) {
                    var f = $filter("date")(from, "dd.MM.yyyy");
                    var t = $filter("date")(to, "dd.MM.yyyy");
                    if (rid > 0) {
                        fileService.download('/statistics/resbydate/' + rid + '/' + f + '/' + t, 'reservations_' + f + '_' + t + '.xlsx');
                    } else {
                        toastr.error($translate.instant('sitnet_choose_room'));
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
