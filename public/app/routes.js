(function () {
    'use strict';
    angular.module('sitnet')
        .config(['$routeProvider', 'SITNET_CONF', function ($routeProvider, SITNET_CONF) {

            var tmpl = SITNET_CONF.TEMPLATES_PATH;

            /* Enrollment */
            $routeProvider.when('/enroll/:code', { templateUrl: tmpl + 'enrolment/enroll.html', controller: 'EnrollController'});
            $routeProvider.when('/enroll/:code/exam/:id', { templateUrl: tmpl + 'enrolment/enrollExam.html', controller: 'EnrollController'});


            /* main navigation */
            $routeProvider.when('/home', { templateUrl: tmpl + 'common/home.html', controller: 'DashboardCtrl'});
            $routeProvider.when('/questions', { templateUrl: tmpl + 'question/questions.html', controller: 'QuestionListingController'});
            $routeProvider.when('/exams', { templateUrl: tmpl + 'exam/exams.html', controller: 'ExamController'});

            // create question from exam
            $routeProvider.when('/questions/:id/exam/:examId/section/:sectionId/sequence/:seqId', { templateUrl: tmpl + 'question/editor/question.html'});
            // select from querylist
            $routeProvider.when('/questions/:id', { templateUrl: tmpl + 'question/editor/question.html'});
            // edit question from exam
            $routeProvider.when('/exams/:examId/section/:sectionId/edit/:editId', { templateUrl: tmpl + 'question/editor/question.html'});

            $routeProvider.when('/exams/:id', { templateUrl: tmpl + 'exam/editor/exam.html', controller: 'ExamController'});
            $routeProvider.when('/exampreview/:id', { templateUrl: tmpl + 'exam/editor/exam.html', controller: 'ExamController'});

            $routeProvider.when('/calendar/:enrolment?', { templateUrl: tmpl + 'reservation/calendar.html'});

            $routeProvider.when('/invalid_session', { templateUrl: tmpl + 'common/invalid_session.html'});

            /* extra */
            $routeProvider.when('/user', { templateUrl: tmpl + 'common/user.html', controller: 'SessionCtrl'});
            $routeProvider.when('/login', { templateUrl: tmpl + 'common/login.html', controller: 'SessionCtrl' });
            $routeProvider.when('/logout', { templateUrl: tmpl + 'common/login.html', controller: 'SessionCtrl' });
            $routeProvider.when('/machines/:id', { templateUrl: tmpl + 'facility/machine.html', controller: 'MachineCtrl'});
            $routeProvider.when('/softwares', { templateUrl: tmpl + 'facility/software.html', controller: 'RoomCtrl'});
            $routeProvider.when('/accessibility', { templateUrl: tmpl + 'facility/accessibility.html', controller: 'AccessibilityCtrl'});
            $routeProvider.when('/softwares/update/:id/:name', { templateUrl: tmpl + 'facility/software.html', controller: 'RoomCtrl'});
            $routeProvider.when('/softwares/:id', { templateUrl: tmpl + 'facility/software.html', controller: 'RoomCtrl'});
            $routeProvider.when('/softwares/add/:name', { templateUrl: tmpl + 'facility/software.html', controller: 'RoomCtrl'});

            /* Student */
            $routeProvider.when('/student/doexam/:hash', { templateUrl: tmpl + 'exam/student/exam.html', controller: 'StudentExamController'});
            $routeProvider.when('/feedback/exams/:id', { templateUrl: tmpl + 'enrolment/exam_feedback.html', controller: 'ExamFeedbackController'});
            $routeProvider.when('/student/waitingroom', { templateUrl: tmpl + 'enrolment/waitingroom.html', controller: 'WaitingRoomCtrl'});
            $routeProvider.when('/student/wrongmachine', { templateUrl: tmpl + 'enrolment/wrong_machine.html', controller: 'WrongMachineCtrl'});

            /* Teacher */
            $routeProvider.when('/exams/review/:id', { templateUrl: tmpl + 'review/review.html', controller: 'ExamReviewController'});
            $routeProvider.when('/exams/reviews/:id', { templateUrl: tmpl + 'review/review_list.html', controller: 'ReviewListingController'});
            $routeProvider.when('/exams/preview/:id', { templateUrl: tmpl + 'exam/editor/preview_exam.html', controller: 'TeacherExamController' });

            /* Admin */
            $routeProvider.when('/rooms', { templateUrl: tmpl + 'facility/rooms.html', controller: 'RoomCtrl'});
            $routeProvider.when('/rooms/:id', { templateUrl: tmpl + 'facility/room.html', controller: 'RoomCtrl'});
            $routeProvider.when('/reports', { templateUrl: tmpl + 'administrative/reports/reports.html', controller: 'ReportController'});
            $routeProvider.when('/admin/reservations/', { templateUrl: tmpl + 'reservation/reservations.html', controller: 'AdminReservationController'});
            $routeProvider.when('/admin/reservations/list/student/:id/:start/:end', { templateUrl: tmpl + 'reservation/reservations.html', controller: 'AdminReservationController'});
            $routeProvider.when('/admin/reservations/list/room/:id/:start/:end', { templateUrl: tmpl + 'reservation/reservations.html', controller: 'AdminReservationController'});
            $routeProvider.when('/admin/reservations/list/exam/:id/:start/:end', { templateUrl: tmpl + 'reservation/reservations.html', controller: 'AdminReservationController'});
            $routeProvider.when('/admin/reservations/list/student:sid/room:rid/exam:eid', { templateUrl: tmpl + 'reservation/reservations.html', controller: 'AdminReservationController'});

            $routeProvider.otherwise({redirectTo: '/home'});
        }]);
}());