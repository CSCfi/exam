'use strict';

angular.module('app.administrative.reports')
    .component('reports', {
        templateUrl: '/assets/app/administrative/reports/reports.template.html',
        controller: ['$translate', 'EXAM_CONF', 'Reports', 'Room', 'DateTime', '$filter', 'UserRes', 'Files', 'toast',
            function ($translate, EXAM_CONF, Reports, Room, DateTime, $filter, UserRes, Files, toast) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.csvExport = {};
                    ctrl.templates = {
                        examRoomReservations: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/exam-room-reservations.html',
                        teacherExamsReport: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/teacher-exams.html',
                        reviewedExams: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/reviewed-exams.html',
                        examReport: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/exam-report.html',
                        examReportJson: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/exam-report-json.html',
                        examAnswers: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/exam-answers.html',
                        examEnrollmentsReport: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/exam-enrollments.html',
                        studentReport: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/student.html',
                        examRecordsCsv: EXAM_CONF.TEMPLATES_PATH + 'administrative/reports/templates/exam-records-csv.html'
                    };

                    ctrl.selectedFields = {
                        room: {name: $translate.instant('sitnet_choose')}
                    };

                    ctrl.rooms = Room.rooms.query();
                    ctrl.examNames = Reports.examNames.query();

                    ctrl.teachers = UserRes.usersByRole.query({role: 'TEACHER'});
                    ctrl.students = UserRes.usersByRole.query({role: 'STUDENT'});
                };


                ctrl.setRoom = function (room) {
                    ctrl.selectedFields.room = room;
                };


                ctrl.getExamEnrollments = function (exam) {
                    if (exam) {
                        Files.download('/app/statistics/examenrollments/' + exam.id, 'exam_enrolments.xlsx');
                    } else {
                        toast.error($translate.instant('sitnet_choose_exam'));
                    }
                };

                ctrl.getStudentReport = function (student) {
                    if (student) {
                        var f = $filter('date')(ctrl.studentStartDate || new Date(), 'dd.MM.yyyy');
                        var t = $filter('date')(ctrl.studentEndDate || new Date(), 'dd.MM.yyyy');
                        Files.download('/app/statistics/student/' + student.id + '/' + f + '/' + t, 'student_activity.xlsx');
                    } else {
                        toast.error($translate.instant('sitnet_choose_student'));
                    }
                };

                ctrl.getExamAnswerReport = function () {
                    var f = $filter('date')(ctrl.answerStartDate || new Date(), 'dd.MM.yyyy');
                    var t = $filter('date')(ctrl.answerEndDate || new Date(), 'dd.MM.yyyy');
                    Files.download('/app/statistics/allexams/' + f + '/' + t, 'exam_answers_' + f + '_' + t + '.xlsx');
                };

                ctrl.getExamsXlsx = function (exam) {
                    if (exam) {
                        Files.download('/app/statistics/examnames/' + exam.id + '/xlsx', 'exams.xlsx');
                    } else {
                        toast.error($translate.instant('sitnet_choose_exam'));
                    }
                };

                ctrl.getExamsJson = function (exam) {
                    if (exam) {
                        Files.download('/app/statistics/examnames/' + exam.id + '/json', 'exams.json');
                    } else {
                        toast.error($translate.instant('sitnet_choose_exam'));
                    }
                };

                ctrl.getReviewsByDate = function () {
                    var f = $filter('date')(ctrl.reviewStartDate || new Date(), 'dd.MM.yyyy');
                    var t = $filter('date')(ctrl.reviewEndDate || new Date(), 'dd.MM.yyyy');
                    Files.download('/app/statistics/reviewsbydate/' + f + '/' + t, 'reviews_' + f + '_' + t + '.xlsx');
                };

                ctrl.getTeacherExamsByDate = function (teacher) {
                    var f = $filter('date')(ctrl.teacherStartDate || new Date(), 'dd.MM.yyyy');
                    var t = $filter('date')(ctrl.teacherEndDate || new Date(), 'dd.MM.yyyy');
                    if (teacher) {
                        Files.download('/app/statistics/teacherexamsbydate/' + teacher.id + '/' + f + '/' + t,
                            'teacherexams_' + f + '_' + t + '.xlsx');
                    } else {
                        toast.error($translate.instant('sitnet_choose_teacher'));
                    }
                };

                ctrl.getRoomReservationsByDate = function (rid) {
                    var f = $filter('date')(ctrl.reservationStartDate || new Date(), 'dd.MM.yyyy');
                    var t = $filter('date')(ctrl.reservationEndDate || new Date(), 'dd.MM.yyyy');
                    if (rid > 0) {
                        Files.download('/app/statistics/resbydate/' + rid + '/' + f + '/' + t, 'reservations_' + f + '_' + t + '.xlsx');
                    } else {
                        toast.error($translate.instant('sitnet_choose_room'));
                    }
                };

                ctrl.getExamRecords = function () {
                    var start = ctrl.recordCsvStartDate ? new Date(ctrl.recordCsvStartDate).getTime() : new Date().getTime();
                    var end = ctrl.recordCsvEndDate
                        ? new Date(ctrl.recordCsvEndDate).getTime().setHours(23, 59, 59, 999)
                        : new Date().getTime().setHours(23, 59, 59, 999);
                    Files.download('/app/exam/record', 'examrecords.csv', {'startDate': start, 'endDate': end});
                };

                ctrl.answerStartDateChanged = function (date) {
                    ctrl.answerStartDate = date;
                };

                ctrl.answerEndDateChanged = function (date) {
                    ctrl.answerEndDate = date;
                };

                ctrl.recordCsvStartDateChanged = function (date) {
                    ctrl.recordCsvStartDate = date;
                };

                ctrl.recordCsvEndDateChanged = function (date) {
                    ctrl.recordCsvEndDate = date;
                };

                ctrl.reservationStartDateChanged = function (date) {
                    ctrl.reservationStartDate = date;
                };

                ctrl.reservationEndDateChanged = function (date) {
                    ctrl.reservationEndDate = date;
                };

                ctrl.reviewStartDateChanged = function (date) {
                    ctrl.reviewStartDate = date;
                };

                ctrl.reviewEndDateChanged = function (date) {
                    ctrl.reviewEndDate = date;
                };

                ctrl.studentStartDateChanged = function (date) {
                    ctrl.studentStartDate = date;
                };

                ctrl.studentEndDateChanged = function (date) {
                    ctrl.studentEndDate = date;
                };

                ctrl.teacherStartDateChanged = function (date) {
                    ctrl.teacherStartDate = date;
                };

                ctrl.teacherEndDateChanged = function (date) {
                    ctrl.teacherEndDate = date;
                };


            }
        ]
    });

