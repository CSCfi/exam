(function () {
    'use strict';
    angular.module('sitnet')
        .config(['$routeProvider', 'SITNET_CONF', function ($routeProvider, SITNET_CONF) {

            var tmpl = SITNET_CONF.TEMPLATES_PATH;

            /* Enrollment */
            $routeProvider.when('/enroll/:code', { templateUrl: tmpl + 'enroll.html', controller: 'EnrollController'});
            $routeProvider.when('/enroll/:code/exam/:id', { templateUrl: tmpl + 'student/enrollExam.html', controller: 'EnrollController'});


            /* main navigation */
            $routeProvider.when('/home', { templateUrl: tmpl + 'home.html', controller: 'DashboardCtrl'});
            $routeProvider.when('/questions', { templateUrl: tmpl + 'question-listing/questions.html', controller: 'QuestionListingController'});
            $routeProvider.when('/questions/:id/exam/:examId/section/:sectionId', { templateUrl: tmpl + 'question-editor/question.html'});
            $routeProvider.when('/questions/:id', { templateUrl: tmpl + 'question-editor/question.html'});
            $routeProvider.when('/reports', { templateUrl: tmpl + 'reports.html'});
            $routeProvider.when('/exams', { templateUrl: tmpl + 'exams.html', controller: 'ExamController'});
            $routeProvider.when('/exams/:examId/section/:sectionId/edit/:editId', { templateUrl: tmpl + 'question-editor/question.html'});
            $routeProvider.when('/exams/:id', { templateUrl: tmpl + 'exam-editor/exam.html', controller: 'ExamController'});
            $routeProvider.when('/exampreview/:id', { templateUrl: tmpl + 'exam-editor/exam.html', controller: 'ExamController'});
            $routeProvider.when('/calendar/:enrolment?', { templateUrl: tmpl + 'calendar.html'});
            $routeProvider.when('/notifications', { templateUrl: tmpl + 'notifications.html'});
            $routeProvider.when('/messages', { templateUrl: tmpl + 'messages.html'});
            $routeProvider.when('/tools', { templateUrl: tmpl + 'tools.html'});

            $routeProvider.when('/invalid_session', { templateUrl: tmpl + 'invalid_session.html'});

            /* extra */
            $routeProvider.when('/user', { templateUrl: tmpl + 'user.html', controller: 'UserCtrl'});
            $routeProvider.when('/login', { templateUrl: tmpl + 'login.html', controller: 'SessionCtrl' });
            $routeProvider.when('/logout', { templateUrl: tmpl + 'logout.html', controller: 'SessionCtrl' });
            $routeProvider.when('/courses', { templateUrl: tmpl + 'courses.html', controller: 'CourseCtrl'});
            $routeProvider.when('/machines', { templateUrl: tmpl + 'admin/machine.html', controller: 'RoomCtrl'});
            $routeProvider.when('/machines/:id', { templateUrl: tmpl + 'admin/machine.html', controller: 'MachineCtrl'});
            $routeProvider.when('/softwares', { templateUrl: tmpl + 'admin/software.html', controller: 'RoomCtrl'});
            $routeProvider.when('/accessibility', { templateUrl: tmpl + 'admin/accessibility.html', controller: 'AccessibilityCtrl'});
            $routeProvider.when('/softwares/update/:id/:name', { templateUrl: tmpl + 'admin/software.html', controller: 'RoomCtrl'});
            $routeProvider.when('/softwares/:id', { templateUrl: tmpl + 'admin/software.html', controller: 'RoomCtrl'});
            $routeProvider.when('/softwares/add/:name', { templateUrl: tmpl + 'admin/software.html', controller: 'RoomCtrl'});

            /* Student */
            $routeProvider.when('/student/doexam/:hash', { templateUrl: tmpl + 'student/exam.html', controller: 'StudentExamController'});
            $routeProvider.when('/feedback/exams/:id', { templateUrl: tmpl + 'student/exam_feedback.html', controller: 'ExamFeedbackController'});

            /* Teacher */
            $routeProvider.when('/exams/review/:id', { templateUrl: tmpl + 'teacher/review.html', controller: 'ExamReviewController'});
            $routeProvider.when('/exams/reviews/:id', { templateUrl: tmpl + 'teacher/review_list.html', controller: 'ReviewListingController'});
            $routeProvider.when('/exams/preview/:id', { templateUrl: tmpl + 'teacher/preview_exam.html', controller: 'TeacherExamController' });

            /* Admin */
            $routeProvider.when('/rooms', { templateUrl: tmpl + 'admin/rooms.html', controller: 'RoomCtrl'});
            $routeProvider.when('/rooms/:id', { templateUrl: tmpl + 'admin/room.html', controller: 'RoomCtrl'});
            $routeProvider.when('/reports', { templateUrl: tmpl + 'reports/reports.html', controller: 'ReportController'});
            $routeProvider.when('/admin/reservations/', { templateUrl: tmpl + 'admin/reservations.html', controller: 'AdminReservationController'});
            $routeProvider.when('/admin/reservations/list/student:id/:start/:end', { templateUrl: tmpl + 'admin/reservations.html', controller: 'AdminReservationController'});
            $routeProvider.when('/admin/reservations/list/room:id/:start/:end', { templateUrl: tmpl + 'admin/reservations.html', controller: 'AdminReservationController'});
            $routeProvider.when('/admin/reservations/list/exam:id/:start/:end', { templateUrl: tmpl + 'admin/reservations.html', controller: 'AdminReservationController'});
            $routeProvider.when('/admin/reservations/list/student:sid/room:rid/exam:eid', { templateUrl: tmpl + 'admin/reservations.html', controller: 'AdminReservationController'});

            $routeProvider.when('/test', { templateUrl: tmpl + 'open_hours.html', controller: 'TestCtrl'});


            $routeProvider.otherwise({redirectTo: '/home'});
        }]);
}());